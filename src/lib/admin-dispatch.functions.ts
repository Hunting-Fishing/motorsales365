import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

const PROFILE_FIELDS =
  "id, full_name, first_name, last_name, business_name, business_city, business_region, avatar_url";

function profileName(p: any): string | null {
  if (!p) return null;
  if (p.business_name) return p.business_name as string;
  if (p.full_name) return p.full_name as string;
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || null;
}

/* ============= Subscriptions tab ============= */

export const adminListDispatchSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.string().max(40).optional(),
        plan_slug: z.string().max(60).optional(),
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("dispatch_subscriptions")
      .select(
        "id, user_id, plan_slug, status, environment, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at",
      )
      .order("current_period_end", { ascending: true, nullsFirst: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.plan_slug) q = q.eq("plan_slug", data.plan_slug);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select(PROFILE_FIELDS).in("id", userIds)
      : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    let enriched = (rows ?? []).map((r: any) => ({
      ...r,
      provider: profileMap.get(r.user_id) ?? null,
    }));

    const term = (data.q ?? "").trim().toLowerCase();
    if (term) {
      enriched = enriched.filter((r: any) => {
        const name = (profileName(r.provider) ?? "").toLowerCase();
        const city = (r.provider?.business_city ?? "").toLowerCase();
        const region = (r.provider?.business_region ?? "").toLowerCase();
        return name.includes(term) || city.includes(term) || region.includes(term);
      });
    }

    return { subscriptions: enriched };
  });

/* ============= Active Jobs tab ============= */

const TOW_REQUEST_FIELDS =
  "id, status, dispatch_status, dispatch_expansions, dispatch_window_ends_at, matched_provider_ids, provider_id, requested_provider_id, requester_id, vehicle_summary, vehicle_make, vehicle_model, pickup_city, pickup_province, pickup_region, dropoff_city, urgency, situation, final_price_php, created_at, updated_at";

// A job is "stuck" if it's still open and either dispatch_expand_stale() has
// already given up on it (dispatch_status = 'expired') or it's been open
// longer than this threshold with no provider accepting.
const STUCK_THRESHOLD_MINUTES = 120;

export const adminListTowRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["active", "open", "all"]).default("active"),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin.from("tow_requests").select(TOW_REQUEST_FIELDS);
    if (data.status === "open") {
      q = q.eq("status", "open");
    } else if (data.status === "active") {
      q = q.not("status", "in", '("completed","cancelled")');
    }
    // Oldest-first when looking at active/open jobs (surfaces stuck ones first);
    // newest-first for the unfiltered history view.
    q = q.order("created_at", { ascending: data.status !== "all" }).limit(data.limit);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const now = Date.now();
    const userIds = new Set<string>();
    for (const r of rows ?? []) {
      if (r.requester_id) userIds.add(r.requester_id);
      if (r.provider_id) userIds.add(r.provider_id);
      if (r.requested_provider_id) userIds.add(r.requested_provider_id);
    }
    const { data: profiles } = userIds.size
      ? await supabaseAdmin.from("profiles").select(PROFILE_FIELDS).in("id", Array.from(userIds))
      : { data: [] as any[] };
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const enriched = (rows ?? []).map((r: any) => {
      const ageMinutes = Math.max(0, Math.floor((now - new Date(r.created_at).getTime()) / 60000));
      const stuck =
        r.status === "open" &&
        (r.dispatch_status === "expired" || ageMinutes > STUCK_THRESHOLD_MINUTES);
      return {
        ...r,
        ageMinutes,
        stuck,
        matchedCount: (r.matched_provider_ids ?? []).length,
        requester: profileMap.get(r.requester_id) ?? null,
        provider: r.provider_id ? profileMap.get(r.provider_id) ?? null : null,
        requestedProvider: r.requested_provider_id
          ? profileMap.get(r.requested_provider_id) ?? null
          : null,
      };
    });

    return { requests: enriched, stuckThresholdMinutes: STUCK_THRESHOLD_MINUTES };
  });

// Manually trigger the same RPC the cron hook calls
// (src/routes/api/public/hooks/dispatch-expand.ts).
export const adminRunDispatchExpand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await (supabaseAdmin as any).rpc("dispatch_expand_stale");
    if (error) throw new Error(error.message);
    return { ok: true, processed: (data as number) ?? 0 };
  });

/* ============= Providers tab ============= */

const PROVIDER_FIELDS =
  "user_id, dispatch_enabled, dispatch_regions, available_24_7, avg_rating, avg_response_sec, flat_base_php, per_km_php, min_php, notes, created_at, updated_at";

export const adminListDispatchProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        q: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("provider_tow_rates")
      .select(PROVIDER_FIELDS)
      .order("dispatch_enabled", { ascending: false })
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const userIds = (rows ?? []).map((r: any) => r.user_id);

    const [profilesRes, eventsRes, subsRes] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select(PROFILE_FIELDS).in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabaseAdmin.from("dispatch_job_events").select("provider_id, event").in("provider_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabaseAdmin
            .from("dispatch_subscriptions")
            .select("user_id, plan_slug, status")
            .in("user_id", userIds)
            .in("status", ["active", "trialing", "past_due"])
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));

    const eventCounts = new Map<string, Record<string, number>>();
    for (const e of (eventsRes.data ?? []) as any[]) {
      const counts = eventCounts.get(e.provider_id) ?? {};
      counts[e.event] = (counts[e.event] ?? 0) + 1;
      eventCounts.set(e.provider_id, counts);
    }

    const subMap = new Map((subsRes.data ?? []).map((s: any) => [s.user_id, s]));

    let enriched = (rows ?? []).map((r: any) => {
      const counts = eventCounts.get(r.user_id) ?? {};
      return {
        ...r,
        provider: profileMap.get(r.user_id) ?? null,
        subscription: subMap.get(r.user_id) ?? null,
        eventCounts: counts,
        acceptedCount: counts.accepted ?? 0,
        declinedCount: counts.declined ?? 0,
        completedCount: counts.completed ?? 0,
      };
    });

    const term = (data.q ?? "").trim().toLowerCase();
    if (term) {
      enriched = enriched.filter((r: any) => {
        const name = (profileName(r.provider) ?? "").toLowerCase();
        const city = (r.provider?.business_city ?? "").toLowerCase();
        const region = (r.provider?.business_region ?? "").toLowerCase();
        return name.includes(term) || city.includes(term) || region.includes(term);
      });
    }

    enriched.sort((a: any, b: any) => b.acceptedCount - a.acceptedCount);

    return { providers: enriched };
  });
