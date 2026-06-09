import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const acceptDispatchedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.requestId)) throw new Error("Invalid requestId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Atomic claim: only succeeds if still open and this user is in matched list (or direct request)
    const { data: req, error } = await supabase
      .from("tow_requests")
      .update({
        provider_id: userId,
        status: "assigned",
        dispatch_status: "accepted",
        dispatch_window_ends_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .eq("status", "open")
      .is("provider_id", null)
      .contains("matched_provider_ids", [userId])
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!req) {
      return { ok: false, reason: "Job is no longer available" };
    }
    return { ok: true };
  });

export const declineDispatchedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.requestId)) throw new Error("Invalid requestId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("tow_requests")
      .select("matched_provider_ids")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!row) return { ok: false };
    const next = (row as any).matched_provider_ids.filter((id: string) => id !== userId);
    await supabase
      .from("tow_requests")
      .update({ matched_provider_ids: next, updated_at: new Date().toISOString() })
      .eq("id", data.requestId);
    return { ok: true };
  });

export const updateDispatchSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { enabled: boolean; regions: string[] }) => {
    if (!Array.isArray(data.regions)) throw new Error("regions must be array");
    return {
      enabled: Boolean(data.enabled),
      regions: data.regions.filter((r) => typeof r === "string").slice(0, 99),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("provider_tow_rates").upsert(
      {
        user_id: userId,
        dispatch_enabled: data.enabled,
        dispatch_regions: data.regions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return { ok: true };
  });

export const getMyDispatchStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("dispatch_subscriptions")
      .select("plan_slug, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: rates } = await supabase
      .from("provider_tow_rates")
      .select("dispatch_enabled, dispatch_regions")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      subscription: sub ?? null,
      enabled: (rates as any)?.dispatch_enabled ?? false,
      regions: ((rates as any)?.dispatch_regions ?? []) as string[],
    };
  });
