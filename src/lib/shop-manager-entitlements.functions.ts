// Shop Manager tier entitlements: read the caller's tier + limits + features
// for a given business. Used by both server callers and the client hook.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ShopManagerTier = "free" | "starter" | "pro" | "enterprise";

export type ShopManagerFeatures = {
  custom_domain: boolean;
  ai_translate: boolean;
  ai_doc_check: boolean;
  ai_dvi: boolean;
  ai_smart_search: boolean;
  white_label: boolean;
  priority_support: boolean;
  custom_reports: boolean;
  gl_drilldown: boolean;
  multi_location: boolean;
};

export type ShopManagerLimits = {
  inventory_skus: number | null;
  invoices_per_month: number | null;
  team_seats: number | null;
  locations: number | null;
  listings: number | null;
  network_sharing: "none" | "read" | "read_write" | "priority";
};

export type ShopManagerEntitlements = {
  tier: ShopManagerTier;
  planId: string | null;
  planName: string;
  features: ShopManagerFeatures;
  limits: ShopManagerLimits;
  aiCeiling: number;
  aiUsed: number;
  basePricePhp: number;
  status: string;
  interval: "month" | "year";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  autoUpgrade: boolean;
  countryCode: string | null;
};

const FREE_FEATURES: ShopManagerFeatures = {
  custom_domain: false,
  ai_translate: false,
  ai_doc_check: false,
  ai_dvi: false,
  ai_smart_search: false,
  white_label: false,
  priority_support: false,
  custom_reports: false,
  gl_drilldown: false,
  multi_location: false,
};

const FREE_LIMITS: ShopManagerLimits = {
  inventory_skus: 100,
  invoices_per_month: 25,
  team_seats: 1,
  locations: 1,
  listings: 5,
  network_sharing: "none",
};

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Load the tier + feature/limit rules for a business. Never throws for missing sub — returns Free. */
export const getShopManagerEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.businessId)) throw new Error("Invalid businessId");
    return d;
  })
  .handler(async ({ data, context }): Promise<ShopManagerEntitlements> => {
    const { supabase, userId, claims } = context;
    const { isStaffClaims } = await import("@/lib/staff-domain");
    const isStaff = isStaffClaims(claims as any);

    // Membership check — owner or staff of the business.
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, owner_id, type_slug")
      .eq("id", data.businessId)
      .maybeSingle();
    if (!biz) throw new Error("Business not found");

    let allowed = (biz as any).owner_id === userId;
    if (!allowed) {
      const { data: isMember } = await supabase.rpc("is_business_member", {
        _user: userId,
        _business: data.businessId,
      });
      allowed = !!isMember;
    }
    if (!allowed && !isStaff) throw new Error("Forbidden");

    const businessKind = ((biz as any).type_slug as string | null) ?? "default";

    // Current subscription (if any).
    const { data: sub } = await supabase
      .from("shop_manager_subscriptions")
      .select(
        "plan_id, tier, status, interval, country_code, current_period_end, cancel_at_period_end, auto_upgrade",
      )
      .eq("business_id", data.businessId)
      .maybeSingle();

    // Internal @365motorsales.com staff get complimentary top-tier access so
    // they can dogfood and file bugs without paying.
    const tier: ShopManagerTier = isStaff
      ? "enterprise"
      : ((sub as any)?.tier as ShopManagerTier) || "free";

    // Plan definition — try exact (kind, tier), fall back to (default, tier).
    let planRow: any = null;
    const { data: exact } = await supabase
      .from("shop_manager_plans")
      .select("id, name, features, limits, ai_ceiling, base_price_php")
      .eq("business_kind", businessKind)
      .eq("tier", tier)
      .eq("active", true)
      .maybeSingle();
    planRow = exact;
    if (!planRow) {
      const { data: fallback } = await supabase
        .from("shop_manager_plans")
        .select("id, name, features, limits, ai_ceiling, base_price_php")
        .eq("business_kind", "default")
        .eq("tier", tier)
        .eq("active", true)
        .maybeSingle();
      planRow = fallback;
    }

    const features: ShopManagerFeatures = {
      ...FREE_FEATURES,
      ...(planRow?.features ?? {}),
    };
    const limits: ShopManagerLimits = {
      ...FREE_LIMITS,
      ...(planRow?.limits ?? {}),
    };

    if (isStaff) {
      // Unlock everything for internal staff even if no enterprise plan row exists.
      (Object.keys(features) as (keyof ShopManagerFeatures)[]).forEach((k) => {
        features[k] = true;
      });
      limits.inventory_skus = null;
      limits.invoices_per_month = null;
      limits.team_seats = null;
      limits.locations = null;
      limits.listings = null;
      limits.network_sharing = "priority";
    }

    // Fair-use AI usage for the current UTC month.
    const { data: usage } = await supabase
      .from("shop_manager_ai_usage")
      .select("calls_used")
      .eq("business_id", data.businessId)
      .eq("month_key", monthKey())
      .maybeSingle();

    return {
      tier,
      planId: planRow?.id ?? null,
      planName: isStaff ? `${planRow?.name ?? "Enterprise"} (365 Staff)` : (planRow?.name ?? "Free"),
      features,
      limits,
      aiCeiling: isStaff ? Math.max(Number(planRow?.ai_ceiling ?? 0), 5000) : (planRow?.ai_ceiling ?? 0),
      aiUsed: (usage as any)?.calls_used ?? 0,
      basePricePhp: isStaff ? 0 : Number(planRow?.base_price_php ?? 0),
      status: ((sub as any)?.status as string) ?? "active",
      interval: ((sub as any)?.interval as "month" | "year") ?? "month",
      currentPeriodEnd: ((sub as any)?.current_period_end as string | null) ?? null,
      cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
      autoUpgrade: !!(sub as any)?.auto_upgrade,
      countryCode: ((sub as any)?.country_code as string | null) ?? null,
    };
  });

/** Public: list all plans for a business kind (used by pricing page). */
export const listShopManagerPlans = createServerFn({ method: "POST" })
  .inputValidator((d: { businessKind?: string }) => d)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabasePublic = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const kind = data.businessKind || "default";
    // Try requested kind first; fall back to default.
    let { data: rows } = await supabasePublic
      .from("shop_manager_plans")
      .select("id, business_kind, tier, name, blurb, base_price_php, yearly_discount_pct, features, limits, ai_ceiling, sort_order")
      .eq("active", true)
      .eq("business_kind", kind)
      .order("sort_order", { ascending: true });
    if (!rows || rows.length === 0) {
      const { data: fallback } = await supabasePublic
        .from("shop_manager_plans")
        .select("id, business_kind, tier, name, blurb, base_price_php, yearly_discount_pct, features, limits, ai_ceiling, sort_order")
        .eq("active", true)
        .eq("business_kind", "default")
        .order("sort_order", { ascending: true });
      rows = fallback ?? [];
    }
    return rows;
  });

/** Public: list active regional pricing rows (used by pricing page). */
export const listShopManagerRegions = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const supabasePublic = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await supabasePublic
    .from("shop_manager_regional_pricing")
    .select("country_code, country_name, ppp_multiplier, currency, currency_symbol, fx_to_php, price_ends_in")
    .eq("active", true)
    .order("country_name", { ascending: true });
  return data ?? [];
});

/** Convert a PHP price to a local currency using PPP × FX with tail snapping. */
export function computeLocalPrice(basePhp: number, pppMultiplier: number, fxToPhp: number, endsIn: string): number {
  if (basePhp <= 0) return 0;
  const adjustedPhp = basePhp * pppMultiplier;
  const local = adjustedPhp / (fxToPhp || 1);
  if (local <= 0) return 0;
  // For small values (USD/EUR-like) keep two decimals; for larger, snap to nearest integer.
  if (local < 100) return Math.round(local * 100) / 100;
  const rounded = Math.round(local);
  const digit = parseInt(endsIn, 10);
  if (!Number.isFinite(digit)) return rounded;
  // Snap last digit to `digit` (e.g. 500 -> 499).
  const base = Math.floor(rounded / 10) * 10;
  const snapped = base + digit;
  return snapped <= rounded ? snapped : Math.max(0, snapped - 10);
}
