// Server functions for the Shop Manager portal — entitlement read + SSO handoff.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SHOP_MANAGER_LOOKUP_KEYS = ["shop_manager_solo_monthly", "shop_manager_pro_monthly"] as const;
type ShopManagerLookupKey = (typeof SHOP_MANAGER_LOOKUP_KEYS)[number];

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find any active subscription this user has whose plan is a Shop Manager plan.
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

    const tier = tierFromLookupKey((sub as any)?.subscription_plans?.stripe_lookup_key ?? null);
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

/**
 * Returns a one-shot redirect URL that drops the caller into the All Business 365
 * Shop Manager deployment, signed in. Lazily provisions a partner Auth user on
 * first call. Throws if the caller doesn't have an active Shop Manager plan.
 */
export const requestShopManagerSsoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ returnPath: z.string().startsWith("/").max(200).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sso = await import("./shop-manager-sso.server");

    // 1) Verify the caller actually has access (re-run the same query as getShopManagerAccess
    //    but only the bits we need to mint a token).
    const { data: plans } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, stripe_lookup_key")
      .in("stripe_lookup_key", SHOP_MANAGER_LOOKUP_KEYS as unknown as string[]);
    const planIds = (plans ?? []).map((p: any) => p.id);
    if (planIds.length === 0) throw new Error("Shop Manager plans not configured");

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "status, current_period_end, plan_id, subscription_plans:plan_id ( stripe_lookup_key )",
      )
      .eq("user_id", context.userId)
      .in("plan_id", planIds)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) throw new Error("No active Shop Manager subscription");
    const periodEnd = (sub as any).current_period_end as string | null;
    if (periodEnd && new Date(periodEnd).getTime() < Date.now()) {
      throw new Error("Shop Manager subscription has expired");
    }

    const tier = tierFromLookupKey(
      (sub as any).subscription_plans?.stripe_lookup_key as ShopManagerLookupKey,
    );
    if (!tier) throw new Error("Unknown Shop Manager tier");

    // 2) Resolve buyer email + name from our profile / auth.
    const { data: { user: authUser } = { user: null } } = await supabaseAdmin.auth.admin.getUserById(
      context.userId,
    );
    const email = authUser?.email?.toLowerCase();
    if (!email) throw new Error("Caller has no verified email");

    // 3) Provision partner Auth user if we haven't already, then upsert local ledger row.
    const { data: existingProv } = await supabaseAdmin
      .from("shop_manager_provisioning")
      .select("id, external_account_id, sso_provisioned_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    let externalAccountId = (existingProv as any)?.external_account_id as string | null;
    if (!externalAccountId) {
      try {
        externalAccountId = await sso.ensurePartnerAuthUser(email);
      } catch (err) {
        await supabaseAdmin
          .from("shop_manager_provisioning")
          .upsert(
            {
              user_id: context.userId,
              external_user_email: email,
              tier,
              last_error: err instanceof Error ? err.message : String(err),
            },
            { onConflict: "user_id" },
          );
        throw err;
      }
    }

    await supabaseAdmin
      .from("shop_manager_provisioning")
      .upsert(
        {
          user_id: context.userId,
          external_account_id: externalAccountId,
          external_user_email: email,
          tier,
          sso_provisioned_at:
            (existingProv as any)?.sso_provisioned_at ?? new Date().toISOString(),
          last_sso_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: "user_id" },
      );

    // 4) Mint token + build redirect.
    const token = await sso.mintShopManagerSsoToken({
      sub: externalAccountId,
      email,
      tier,
      src: "365motorsales",
    });
    const url = sso.buildShopManagerRedirect(token, data.returnPath);
    return { url };
  });
