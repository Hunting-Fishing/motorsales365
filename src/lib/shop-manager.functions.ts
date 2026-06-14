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

// ---------- Admin diagnostic: verify the 3 Shop Manager secrets ----------

export type ShopManagerSecretCheck = {
  name: string;
  ok: boolean;
  level: "ok" | "warn" | "error";
  message: string;
};

export type ShopManagerDiagnosticResult = {
  checks: ShopManagerSecretCheck[];
  partnerPing: { ok: boolean; status: number | null; message: string };
};

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const pad = (s: string) => s + "=".repeat((4 - (s.length % 4)) % 4);
    const json = atob(pad(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const diagnoseShopManagerSecrets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShopManagerDiagnosticResult> => {
    // Admin gate
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) throw new Error("Forbidden");

    const url = process.env.SHOP_MANAGER_SUPABASE_URL ?? "";
    const key = process.env.SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY ?? "";
    const sso = process.env.SHOP_MANAGER_SSO_SECRET ?? "";
    const checks: ShopManagerSecretCheck[] = [];

    // 1) URL check
    if (!url) {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_URL",
        ok: false,
        level: "error",
        message: "Not set.",
      });
    } else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_URL",
        ok: false,
        level: "error",
        message: `Doesn't look like a Supabase URL. Got: "${url.slice(0, 40)}${url.length > 40 ? "…" : ""}". Expected https://xxxxx.supabase.co`,
      });
    } else {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_URL",
        ok: true,
        level: "ok",
        message: `Valid Supabase URL (${url}).`,
      });
    }

    // 2) Service role key check
    const keyPayload = decodeJwtPayload(key);
    if (!key) {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY",
        ok: false,
        level: "error",
        message: "Not set.",
      });
    } else if (!keyPayload) {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY",
        ok: false,
        level: "error",
        message: "Not a valid JWT. Paste the service_role key from the All Business 365 project.",
      });
    } else if (keyPayload.role !== "service_role") {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY",
        ok: false,
        level: "error",
        message: `This is a "${keyPayload.role}" key, not service_role. Paste the SERVICE ROLE key (Project Settings → API → service_role).`,
      });
    } else {
      checks.push({
        name: "SHOP_MANAGER_SUPABASE_SERVICE_ROLE_KEY",
        ok: true,
        level: "ok",
        message: `Valid service_role JWT (project ref: ${keyPayload.ref ?? "?"}).`,
      });
    }

    // 3) SSO secret check
    if (!sso) {
      checks.push({
        name: "SHOP_MANAGER_SSO_SECRET",
        ok: false,
        level: "error",
        message: "Not set. Invent a random string (32+ chars) and use the same value on the partner side as MOTORSALES_SSO_SECRET.",
      });
    } else if (sso === key || sso === url) {
      checks.push({
        name: "SHOP_MANAGER_SSO_SECRET",
        ok: false,
        level: "error",
        message: "Same value as another secret. Must be a distinct random string.",
      });
    } else if (sso.length < 24) {
      checks.push({
        name: "SHOP_MANAGER_SSO_SECRET",
        ok: false,
        level: "warn",
        message: `Too short (${sso.length} chars). Use 32+ random characters.`,
      });
    } else if (decodeJwtPayload(sso)) {
      checks.push({
        name: "SHOP_MANAGER_SSO_SECRET",
        ok: false,
        level: "warn",
        message: "Looks like a JWT. This should be a random shared password you invent, not a Supabase key.",
      });
    } else {
      checks.push({
        name: "SHOP_MANAGER_SSO_SECRET",
        ok: true,
        level: "ok",
        message: `Looks good (${sso.length} chars, distinct).`,
      });
    }

    // 4) Live partner ping — only if URL + key look usable
    const urlOk = checks[0].ok;
    const keyOk = checks[1].ok;
    let partnerPing: ShopManagerDiagnosticResult["partnerPing"];
    if (!urlOk || !keyOk) {
      partnerPing = {
        ok: false,
        status: null,
        message: "Skipped — fix URL/service role key first.",
      };
    } else {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const partner = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await partner.auth.admin.listUsers({ page: 1, perPage: 1 });
        if (error) {
          partnerPing = {
            ok: false,
            status: (error as any).status ?? null,
            message: `Partner rejected the call: ${error.message}`,
          };
        } else {
          partnerPing = {
            ok: true,
            status: 200,
            message: `Connected. Partner project has ${data?.users?.length ?? 0}+ users on page 1.`,
          };
        }
      } catch (e) {
        partnerPing = {
          ok: false,
          status: null,
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }

    return { checks, partnerPing };
  });
