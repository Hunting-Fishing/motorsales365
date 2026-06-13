import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, type StripeEnv } from "@/lib/stripe.server";
import { recordPaymentForInvoice } from "@/lib/payments-recording.server";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

type BackfillResult = {
  environment: StripeEnv;
  subscriptionsChecked: number;
  invoicesChecked: number;
  paymentsInserted: number;
  errors: string[];
};

/**
 * Backfill historical `payments` rows for business directory and dispatch
 * (towing provider) subscriptions.
 *
 * Before the §2.1 fix, recordPaymentFromInvoice() only checked the general
 * `subscriptions` table, so renewal invoices for business/dispatch
 * subscriptions never produced a `payments` row. This walks every
 * business_subscriptions / dispatch_subscriptions row with a Stripe
 * subscription id, lists its paid invoices, and records any that are
 * missing. Idempotent (reference = stripe_invoice:{id}) — safe to re-run.
 */
export const adminBackfillSubscriptionPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: BackfillResult[] = [];

    for (const env of ["live", "sandbox"] as StripeEnv[]) {
      const result: BackfillResult = {
        environment: env,
        subscriptionsChecked: 0,
        invoicesChecked: 0,
        paymentsInserted: 0,
        errors: [],
      };

      let stripe: ReturnType<typeof createStripeClient>;
      try {
        stripe = createStripeClient(env);
      } catch {
        // Stripe not configured for this environment — skip.
        results.push(result);
        continue;
      }

      const subs: Array<{
        stripeSubscriptionId: string;
        userId: string;
        kind: "business_subscription" | "dispatch_subscription";
      }> = [];

      const { data: bizSubs } = await supabaseAdmin
        .from("business_subscriptions")
        .select("owner_user_id, stripe_subscription_id, environment")
        .eq("environment", env)
        .not("stripe_subscription_id", "is", null);
      for (const sub of bizSubs ?? []) {
        const stripeSubscriptionId = (sub as any).stripe_subscription_id as string | null;
        const ownerUserId = (sub as any).owner_user_id as string | null;
        if (!stripeSubscriptionId || !ownerUserId) continue;
        subs.push({ stripeSubscriptionId, userId: ownerUserId, kind: "business_subscription" });
      }

      const { data: dispatchSubs } = await supabaseAdmin
        .from("dispatch_subscriptions")
        .select("user_id, stripe_subscription_id, environment")
        .eq("environment", env)
        .not("stripe_subscription_id", "is", null);
      for (const sub of dispatchSubs ?? []) {
        const stripeSubscriptionId = (sub as any).stripe_subscription_id as string | null;
        const subUserId = (sub as any).user_id as string | null;
        if (!stripeSubscriptionId || !subUserId) continue;
        subs.push({ stripeSubscriptionId, userId: subUserId, kind: "dispatch_subscription" });
      }

      for (const sub of subs) {
        result.subscriptionsChecked++;
        try {
          // 100 paid invoices covers 8+ years of monthly billing — more than
          // enough history for this backfill.
          const invoices = await stripe.invoices.list({
            subscription: sub.stripeSubscriptionId,
            status: "paid",
            limit: 100,
          });
          for (const invoice of invoices.data) {
            result.invoicesChecked++;
            const { inserted } = await recordPaymentForInvoice({
              userId: sub.userId,
              kind: sub.kind,
              invoice,
            });
            if (inserted) result.paymentsInserted++;
          }
        } catch (e: any) {
          result.errors.push(`${sub.kind} ${sub.stripeSubscriptionId}: ${e?.message ?? e}`);
        }
      }

      results.push(result);
    }

    return { results };
  });
