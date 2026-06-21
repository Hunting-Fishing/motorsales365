import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "@/lib/stripe.server";

async function assertAdmin(context: any) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (!roles?.some((r: any) => r.role === "admin")) throw new Error("Forbidden");
}

export type GCashStatus = {
  environment: StripeEnv;
  configured: boolean;
  configurationId: string | null;
  configurationName: string | null;
  gcashEnabled: boolean;
  gcashPreference: string | null; // "on" | "off" | "none"
  error?: string;
};

/**
 * Inspect the seller's default Stripe Payment Method Configuration and report
 * whether GCash is turned on. Admin-only.
 */
export const adminCheckStripeGCash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => {
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid environment");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<GCashStatus> => {
    await assertAdmin(context);
    try {
      const stripe = createStripeClient(data.environment);
      const list = await stripe.paymentMethodConfigurations.list({ limit: 20 });
      const cfg =
        list.data.find((c: any) => c.is_default) ?? list.data[0] ?? null;
      if (!cfg) {
        return {
          environment: data.environment,
          configured: false,
          configurationId: null,
          configurationName: null,
          gcashEnabled: false,
          gcashPreference: null,
          error: "No payment method configuration found on this Stripe account.",
        };
      }
      const gcash: any = (cfg as any).gcash;
      const preference: string | null =
        gcash?.display_preference?.preference ?? gcash?.display_preference?.overridable ?? null;
      const gcashEnabled = !!gcash && (gcash.available || preference === "on");
      return {
        environment: data.environment,
        configured: true,
        configurationId: cfg.id,
        configurationName: (cfg as any).name ?? null,
        gcashEnabled,
        gcashPreference: preference,
      };
    } catch (error) {
      return {
        environment: data.environment,
        configured: false,
        configurationId: null,
        configurationName: null,
        gcashEnabled: false,
        gcashPreference: null,
        error: getStripeErrorMessage(error),
      };
    }
  });

/**
 * Turn GCash on (or off) for the seller's default Stripe Payment Method
 * Configuration. Note: GCash availability also requires PH currency support
 * on the Stripe account; if Stripe refuses the toggle, the error message is
 * surfaced verbatim so the admin can act on it.
 */
export const adminToggleStripeGCash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; enabled: boolean }) => {
    if (data.environment !== "sandbox" && data.environment !== "live") {
      throw new Error("Invalid environment");
    }
    return data;
  })
  .handler(
    async ({ data, context }): Promise<{ ok: true; status: GCashStatus } | { error: string }> => {
      await assertAdmin(context);
      try {
        const stripe = createStripeClient(data.environment);
        const list = await stripe.paymentMethodConfigurations.list({ limit: 20 });
        const cfg =
          list.data.find((c: any) => c.is_default) ?? list.data[0] ?? null;
        if (!cfg) return { error: "No payment method configuration found." };

        await stripe.paymentMethodConfigurations.update(cfg.id, {
          gcash: {
            display_preference: { preference: data.enabled ? "on" : "off" },
          },
        } as any);

        const refreshed = await stripe.paymentMethodConfigurations.retrieve(cfg.id);
        const gcash: any = (refreshed as any).gcash;
        const preference: string | null = gcash?.display_preference?.preference ?? null;
        return {
          ok: true,
          status: {
            environment: data.environment,
            configured: true,
            configurationId: refreshed.id,
            configurationName: (refreshed as any).name ?? null,
            gcashEnabled: !!gcash && (gcash.available || preference === "on"),
            gcashPreference: preference,
          },
        };
      } catch (error) {
        return { error: getStripeErrorMessage(error) };
      }
    },
  );
