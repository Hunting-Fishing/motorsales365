// Shop Manager entitlement lookup.
//
// Previously this file also housed an SSO handoff to an external hosted
// Shop Manager deployment. That external deployment is being dissolved and
// the app is being merged in-tree under `src/shop-manager/**` served at
// `/shop`. The SSO server-fn, its partner-Supabase secrets, and the admin
// diagnostic have been removed.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SHOP_MANAGER_LOOKUP_KEYS = [
  "shop_manager_solo_monthly",
  "shop_manager_pro_monthly",
] as const;

function tierFromLookupKey(key: string | null | undefined): "solo" | "pro" | null {
  if (key === "shop_manager_solo_monthly") return "solo";
  if (key === "shop_manager_pro_monthly") return "pro";
  return null;
}

export type ShopManagerAccess = {
  active: boolean;
  tier: "solo" | "pro" | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provisionedAt: string | null;
};

/** Looks up the caller's active Shop Manager subscription. */
export const getShopManagerAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShopManagerAccess> => {
    // Internal @365motorsales.com staff get complimentary Pro access.
    const { isStaffClaims } = await import("@/lib/staff-domain");
    if (isStaffClaims(context.claims as any)) {
      return {
        active: true,
        tier: "pro",
        status: "staff_comp",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        provisionedAt: null,
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plans } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, stripe_lookup_key")
      .in("stripe_lookup_key", SHOP_MANAGER_LOOKUP_KEYS as unknown as string[]);
    const planIds = (plans ?? []).map((p: any) => p.id);
    if (planIds.length === 0) {
      return {
        active: false,
        tier: null,
        status: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        provisionedAt: null,
      };
    }
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "status, current_period_end, cancel_at_period_end, plan_id, subscription_plans:plan_id ( stripe_lookup_key )",
      )
      .eq("user_id", context.userId)
      .in("plan_id", planIds)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tier = tierFromLookupKey(
      (sub as any)?.subscription_plans?.stripe_lookup_key ?? null,
    );
    const periodEnd = (sub as any)?.current_period_end as string | null | undefined;
    const future = !periodEnd || new Date(periodEnd).getTime() > Date.now();
    const active = !!sub && future;

    let provisionedAt: string | null = null;
    if (active) {
      const { data: prov } = await supabaseAdmin
        .from("shop_manager_provisioning")
        .select("sso_provisioned_at")
        .eq("user_id", context.userId)
        .maybeSingle();
      provisionedAt = (prov as any)?.sso_provisioned_at ?? null;
    }

    return {
      active,
      tier,
      status: (sub as any)?.status ?? null,
      currentPeriodEnd: periodEnd ?? null,
      cancelAtPeriodEnd: !!(sub as any)?.cancel_at_period_end,
      provisionedAt,
    };
  });
