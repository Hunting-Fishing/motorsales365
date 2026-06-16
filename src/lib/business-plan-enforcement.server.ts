import type { SupabaseClient } from "@supabase/supabase-js";

export type LimitKey = "staff" | "assets" | "inventory_skus" | "listings" | "tow_jobs_month";

export class PlanLimitError extends Error {
  code = "plan_limit" as const;
  limitKey: LimitKey;
  current: number;
  cap: number;
  tier: string;
  businessId: string;
  constructor(args: { limitKey: LimitKey; current: number; cap: number; tier: string; businessId: string }) {
    super(`Plan limit reached for ${args.limitKey} (${args.current}/${args.cap})`);
    this.limitKey = args.limitKey;
    this.current = args.current;
    this.cap = args.cap;
    this.tier = args.tier;
    this.businessId = args.businessId;
  }
}

export type PlanContext = {
  tier: string;
  planId: string | null;
  planSlug: string | null;
  typeSlug: string | null;
  ownerId: string;
  subId: string | null;
  autoUpgrade: boolean;
  currentPeriodStart: string | null;
  limits: Record<string, number | null | undefined>;
};

async function loadPlanContext(supabase: SupabaseClient, businessId: string): Promise<PlanContext> {
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id, type_slug, subscription_tier")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) throw new Error("Business not found");

  const { data: sub } = await supabase
    .from("business_subscriptions")
    .select("id, plan_id, plan_slug, tier, auto_upgrade, current_period_end, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tier = ((sub as any)?.tier as string) || ((biz as any).subscription_tier as string) || "listed";
  const planSlug = ((sub as any)?.plan_slug as string | null) ?? null;
  let limits: Record<string, number | null | undefined> = {};
  let planId: string | null = ((sub as any)?.plan_id as string | null) ?? null;

  if (planId) {
    const { data: plan } = await supabase
      .from("business_plans")
      .select("limits")
      .eq("id", planId)
      .maybeSingle();
    if (plan) limits = ((plan as any).limits ?? {}) as Record<string, number>;
  } else if (planSlug) {
    const { data: plan } = await supabase
      .from("business_plans")
      .select("id, limits")
      .eq("slug", planSlug)
      .maybeSingle();
    if (plan) {
      limits = ((plan as any).limits ?? {}) as Record<string, number>;
      planId = (plan as any).id ?? null;
    }
  }
  if (Object.keys(limits).length === 0) {
    const { data: fallback } = await supabase
      .from("business_plans")
      .select("id, limits")
      .eq("tier", tier as any)
      .eq("type_slug", (biz as any).type_slug)
      .limit(1)
      .maybeSingle();
    if (fallback) {
      limits = ((fallback as any).limits ?? limits) as Record<string, number>;
      if (!planId) planId = (fallback as any).id ?? null;
    }
  }

  return {
    tier,
    planId,
    planSlug,
    typeSlug: (biz as any).type_slug ?? null,
    ownerId: (biz as any).owner_id,
    subId: ((sub as any)?.id as string | null) ?? null,
    autoUpgrade: !!(sub as any)?.auto_upgrade,
    currentPeriodStart: null,
    limits,
  };
}

async function countUsage(
  supabase: SupabaseClient,
  ctx: PlanContext,
  businessId: string,
  key: LimitKey,
): Promise<number> {
  switch (key) {
    case "staff": {
      const { count } = await supabase
        .from("business_staff")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("active", true);
      return count ?? 0;
    }
    case "assets": {
      const { count } = await supabase
        .from("business_assets")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId);
      return count ?? 0;
    }
    case "inventory_skus": {
      const { count } = await supabase
        .from("business_inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("active", true);
      return count ?? 0;
    }
    case "listings": {
      if (!ctx.ownerId) return 0;
      const { count } = await supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", ctx.ownerId)
        .eq("status", "active");
      return count ?? 0;
    }
    case "tow_jobs_month": {
      if (!ctx.ownerId) return 0;
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("tow_requests")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", ctx.ownerId)
        .gte("created_at", start.toISOString());
      return count ?? 0;
    }
  }
}

async function tryAutoUpgrade(
  supabase: SupabaseClient,
  ctx: PlanContext,
  businessId: string,
  key: LimitKey,
  needed: number,
  actorUserId: string,
): Promise<{ upgraded: boolean; newCtx?: PlanContext }> {
  if (!ctx.autoUpgrade || !ctx.subId) return { upgraded: false };
  if (!ctx.typeSlug) return { upgraded: false };

  // Find next-higher plan (same type, monthly) whose limit covers `needed`
  const { data: plans } = await supabase
    .from("business_plans")
    .select("id, slug, tier, limits, sort_order, price_php, interval")
    .eq("type_slug", ctx.typeSlug)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (!plans?.length) return { upgraded: false };

  const currentOrder =
    (plans as any[]).find((p) => p.id === ctx.planId || p.slug === ctx.planSlug)?.sort_order ?? -1;

  const candidate = (plans as any[]).find((p) => {
    if (p.sort_order <= currentOrder) return false;
    const cap = (p.limits ?? {})[key];
    if (cap == null) return true; // unlimited
    return Number(cap) >= needed;
  });
  if (!candidate) return { upgraded: false };

  const { error: updErr } = await supabase
    .from("business_subscriptions")
    .update({
      plan_id: candidate.id,
      plan_slug: candidate.slug,
      tier: candidate.tier,
    })
    .eq("id", ctx.subId);
  if (updErr) return { upgraded: false };

  // Log via admin client (RLS allows only service_role to insert)
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("business_plan_change_log").insert({
      business_id: businessId,
      from_plan_id: ctx.planId,
      to_plan_id: candidate.id,
      from_tier: ctx.tier,
      to_tier: candidate.tier,
      reason: "auto_upgrade",
      triggered_by: "system",
      actor_user_id: actorUserId,
      metadata: { limit_key: key, needed },
    });
  } catch {
    // non-fatal
  }

  const newCtx: PlanContext = {
    ...ctx,
    planId: candidate.id,
    planSlug: candidate.slug,
    tier: candidate.tier,
    limits: (candidate.limits ?? {}) as Record<string, number>,
  };
  return { upgraded: true, newCtx };
}

/** Throws PlanLimitError if the action would exceed plan caps (and auto-upgrade can't cover it). */
export async function enforceLimit(
  supabase: SupabaseClient,
  businessId: string,
  key: LimitKey,
  actorUserId: string,
  increment = 1,
): Promise<void> {
  let ctx = await loadPlanContext(supabase, businessId);
  const cap = ctx.limits[key];
  if (cap == null) return; // unlimited
  const current = await countUsage(supabase, ctx, businessId, key);
  if (current + increment <= Number(cap)) return;

  // Try auto-upgrade
  const up = await tryAutoUpgrade(supabase, ctx, businessId, key, current + increment, actorUserId);
  if (up.upgraded && up.newCtx) {
    const newCap = up.newCtx.limits[key];
    if (newCap == null || current + increment <= Number(newCap)) return;
    ctx = up.newCtx;
  }

  throw new PlanLimitError({
    limitKey: key,
    current,
    cap: Number(cap),
    tier: ctx.tier,
    businessId,
  });
}

export function planLimitErrorPayload(e: unknown): { error: "plan_limit"; limitKey: LimitKey; current: number; cap: number; tier: string } | null {
  if (e instanceof PlanLimitError) {
    return { error: "plan_limit", limitKey: e.limitKey, current: e.current, cap: e.cap, tier: e.tier };
  }
  return null;
}
