import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanLimits = {
  staff?: number;
  assets?: number;
  listings?: number;
  inventory_skus?: number;
  tow_jobs_month?: number;
  storage_mb?: number;
};

export type PlanUsage = {
  staff: number;
  assets: number;
  listings: number;
  inventory_skus: number;
  tow_jobs_month: number;
  storage_mb: number;
};

export type PlanUsageResult = {
  tier: string;
  planSlug: string | null;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
  autoUpgrade: boolean;
  limits: PlanLimits;
  features: Record<string, boolean>;
  usage: PlanUsage;
  pricePhp: number | null;
  interval: string | null;
  typeSlug: string | null;
};

/** Aggregated plan + live usage counters for a business. */
export const getBusinessPlanUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.businessId)) throw new Error("Invalid businessId");
    return d;
  })
  .handler(async ({ data, context }): Promise<PlanUsageResult> => {
    const { supabase, userId } = context;
    const businessId = data.businessId;

    // Authorize
    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    const { data: biz } = await supabase
      .from("businesses")
      .select("id, owner_id, type_slug, subscription_tier")
      .eq("id", businessId)
      .maybeSingle();
    if (!biz) throw new Error("Business not found");

    // Subscription row (most recent)
    const { data: sub } = await supabase
      .from("business_subscriptions")
      .select(
        "plan_slug, tier, status, current_period_end, cancel_at_period_end, auto_upgrade",
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tier = (sub?.tier as string) || (biz as any).subscription_tier || "listed";
    const planSlug = (sub?.plan_slug as string | null) ?? null;

    // Plan rules
    let limits: PlanLimits = {};
    let features: Record<string, boolean> = {};
    let pricePhp: number | null = null;
    let interval: string | null = null;
    if (planSlug) {
      const { data: plan } = await supabase
        .from("business_plans")
        .select("limits, features, price_php, interval")
        .eq("slug", planSlug)
        .maybeSingle();
      if (plan) {
        limits = ((plan as any).limits ?? {}) as PlanLimits;
        features = ((plan as any).features ?? {}) as Record<string, boolean>;
        pricePhp = Number((plan as any).price_php) || null;
        interval = (plan as any).interval ?? null;
      }
    }
    if (!planSlug || Object.keys(limits).length === 0) {
      // Fallback by tier when no concrete plan row attached
      const { data: anyPlan } = await supabase
        .from("business_plans")
        .select("limits, features")
        .eq("tier", tier as any)
        .eq("type_slug", (biz as any).type_slug)
        .limit(1)
        .maybeSingle();
      if (anyPlan) {
        limits = ((anyPlan as any).limits ?? limits) as PlanLimits;
        features = ((anyPlan as any).features ?? features) as Record<string, boolean>;
      }
    }

    // Live counts
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const providerId = (biz as any).owner_id;

    const [staffRes, assetsRes, invRes, listingsRes, towMonthRes] = await Promise.all([
      supabase
        .from("business_staff")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("active", true),
      supabase
        .from("business_assets")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("business_inventory_items")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("active", true),
      providerId
        ? supabase
            .from("listings")
            .select("id", { count: "exact", head: true })
            .eq("user_id", providerId)
            .eq("status", "active")
        : Promise.resolve({ count: 0 } as any),
      providerId
        ? supabase
            .from("tow_requests")
            .select("id", { count: "exact", head: true })
            .eq("provider_id", providerId)
            .gte("created_at", monthStart.toISOString())
        : Promise.resolve({ count: 0 } as any),
    ]);

    const usage: PlanUsage = {
      staff: staffRes.count ?? 0,
      assets: assetsRes.count ?? 0,
      inventory_skus: invRes.count ?? 0,
      listings: listingsRes.count ?? 0,
      tow_jobs_month: towMonthRes.count ?? 0,
      storage_mb: 0,
    };

    let daysRemaining: number | null = null;
    const cpe = sub?.current_period_end as string | undefined;
    if (cpe) {
      const ms = new Date(cpe).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(ms / 86_400_000));
    }

    return {
      tier,
      planSlug,
      status: (sub?.status as string) || "none",
      cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
      currentPeriodEnd: cpe ?? null,
      daysRemaining,
      autoUpgrade: !!(sub as any)?.auto_upgrade,
      limits,
      features,
      usage,
      pricePhp,
      interval,
      typeSlug: (biz as any).type_slug ?? null,
    };
  });

/** Toggle auto-upgrade on the current subscription row. */
export const setBusinessAutoUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; enabled: boolean }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.businessId)) throw new Error("Invalid businessId");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Only owner can change billing
    const { data: biz } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", data.businessId)
      .maybeSingle();
    if (!biz || (biz as any).owner_id !== userId) throw new Error("Forbidden");

    const { data: sub } = await supabase
      .from("business_subscriptions")
      .select("id")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) throw new Error("No active subscription");

    const { error } = await supabase
      .from("business_subscriptions")
      .update({ auto_upgrade: data.enabled })
      .eq("id", (sub as any).id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Recent plan change log entries for a business. */
export const listBusinessPlanHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.businessId)) throw new Error("Invalid businessId");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isMember } = await supabase.rpc("is_business_member", {
      _user: userId,
      _business: data.businessId,
    });
    if (!isMember) throw new Error("Forbidden");

    const { data: rows, error } = await supabase
      .from("business_plan_change_log")
      .select("id, from_tier, to_tier, reason, triggered_by, created_at, metadata")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

