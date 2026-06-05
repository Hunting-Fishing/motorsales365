import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PUBLIC: returns the subset of given owner_ids that have an approved
 * verification on file. Used to render a "Verified" badge on the public
 * business directory without exposing verification_requests.
 */
export const getVerifiedOwnerIds = createServerFn({ method: "POST" })
  .inputValidator((input: { ownerIds: string[] }) =>
    z
      .object({
        ownerIds: z.array(z.string().uuid()).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.ownerIds.length === 0) return { verifiedOwnerIds: [] as string[] };
    const { data: rows, error } = await supabaseAdmin
      .from("verification_requests")
      .select("user_id")
      .eq("status", "approved")
      .in("user_id", data.ownerIds);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of rows ?? []) set.add((r as any).user_id);
    return { verifiedOwnerIds: Array.from(set) };
  });

/**
 * OWNER: 30-day analytics summary for a business page. Restricted to
 * business owners (Featured / Premium tier check is enforced client-side
 * with a soft gate; server returns data for any owned business).
 */
export const getBusinessAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessId: string; days?: number }) =>
    z
      .object({
        businessId: z.string().uuid(),
        days: z.number().int().min(1).max(365).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id, subscription_tier, name")
      .eq("id", data.businessId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!biz || (biz as any).owner_id !== userId) throw new Error("Not authorized");

    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eErr } = await supabase
      .from("business_page_events")
      .select("kind, occurred_at")
      .eq("business_id", data.businessId)
      .gte("occurred_at", since)
      .limit(10000);
    if (eErr) throw new Error(eErr.message);

    const byKind: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    for (const ev of events ?? []) {
      const k = (ev as any).kind as string;
      byKind[k] = (byKind[k] ?? 0) + 1;
      const d = String((ev as any).occurred_at).slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
    }

    return {
      businessName: (biz as any).name as string,
      subscriptionTier: (biz as any).subscription_tier as
        | "free"
        | "listed"
        | "featured"
        | "premium",
      days,
      total: events?.length ?? 0,
      byKind,
      byDay,
    };
  });
