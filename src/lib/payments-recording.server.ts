import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { alertOps } from "@/lib/alerting.server";
import Stripe from "stripe";

/**
 * Renewal invoices can belong to a general subscription, a business directory
 * subscription, or a dispatch (towing provider) subscription — each lives in
 * its own table. This is the payment_kind used to record each in `payments`.
 */
export type InvoicePaymentKind = "subscription" | "business_subscription" | "dispatch_subscription";

export type InvoicePaymentTarget = {
  userId: string;
  kind: InvoicePaymentKind;
};

/**
 * Resolve which user (and which payment_kind) a renewal invoice belongs to by
 * checking each subscription table in turn, by Stripe subscription id.
 * Returns null if the subscription isn't found in any of them.
 */
export async function resolveInvoiceSubscriptionTarget(
  stripeSubscriptionId: string,
): Promise<InvoicePaymentTarget | null> {
  const { data: subRow } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if ((subRow as any)?.user_id) {
    return { userId: (subRow as any).user_id as string, kind: "subscription" };
  }

  const { data: bizSub } = await supabaseAdmin
    .from("business_subscriptions")
    .select("owner_user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if ((bizSub as any)?.owner_user_id) {
    return { userId: (bizSub as any).owner_user_id as string, kind: "business_subscription" };
  }

  const { data: dispatchSub } = await supabaseAdmin
    .from("dispatch_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if ((dispatchSub as any)?.user_id) {
    return { userId: (dispatchSub as any).user_id as string, kind: "dispatch_subscription" };
  }

  return null;
}

/**
 * Insert a `payments` row for a paid Stripe invoice, idempotent on
 * `reference = stripe_invoice:{invoice.id}`. Used both by the live webhook
 * handler (recordPaymentFromInvoice) and by the historical-invoice backfill
 * (adminBackfillSubscriptionPayments).
 */
export async function recordPaymentForInvoice({
  userId,
  kind,
  invoice,
}: InvoicePaymentTarget & { invoice: Stripe.Invoice }): Promise<{ inserted: boolean }> {
  const reference = `stripe_invoice:${invoice.id}`;
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing) return { inserted: false };

  const line = invoice.lines.data[0] as any;
  const periodStart = line?.period?.start;
  const periodEnd = line?.period?.end;
  const amount = invoice.amount_paid / 100;

  const { error: payError } = await supabaseAdmin.from("payments").insert({
    user_id: userId,
    kind: kind as any,
    status: "paid" as any,
    amount_php: amount,
    gross_amount_php: invoice.subtotal / 100,
    method: "stripe",
    reference,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
    period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    credit_calculated_at: new Date().toISOString(),
    notes: invoice.hosted_invoice_url ?? null,
  } as any);

  if (payError) {
    console.error("[payments] Failed to record payment from invoice", invoice.id, payError);
    void alertOps("payments.invoice.insert_failed", {
      invoiceId: invoice.id,
      userId,
      kind,
      error: payError.message,
    });
    return { inserted: false };
  }

  return { inserted: true };
}
