import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function parseEnv(url: URL): StripeEnv {
  const v = url.searchParams.get("env");
  return v === "live" ? "live" : "sandbox";
}

async function resolvePlanId(lookupKey: string | null | undefined): Promise<string | null> {
  if (!lookupKey) return null;
  const { data } = await supabaseAdmin
    .from("subscription_plans")
    .select("id")
    .eq("stripe_lookup_key", lookupKey)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

async function upsertSubscription(env: StripeEnv, sub: Stripe.Subscription) {
  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  const lookupKey = (sub.metadata?.lookup_key as string | undefined) ?? null;
  if (!userId) return;

  const item = sub.items.data[0];
  const itemLookup = item?.price?.lookup_key ?? null;
  const planId =
    (await resolvePlanId(lookupKey)) ?? (await resolvePlanId(itemLookup));

  if (!planId) {
    console.error("[webhook] could not resolve plan_id for subscription", sub.id);
    return;
  }

  const periodStart = (item as any)?.current_period_start ?? (sub as any).current_period_start;
  const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;
  const status = sub.status === "trialing" ? "active" : sub.status;

  // Cancel any other live rows for this user in the same env
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("environment", env)
    .neq("stripe_subscription_id", sub.id)
    .in("status", ["active", "paused", "pending"]);

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    plan_id: planId,
    status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    environment: env,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  } as any;

  if (existing) {
    await supabaseAdmin.from("subscriptions").update(row).eq("id", (existing as any).id);
  } else {
    await supabaseAdmin.from("subscriptions").insert(row);
  }
}

async function recordPaymentFromInvoice(env: StripeEnv, invoice: Stripe.Invoice) {
  // Only record paid invoices
  if (invoice.status !== "paid") return;
  const subId = (invoice as any).subscription;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!subId || !customerId) return;

  // Find the user via the subscription row
  const { data: subRow } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", typeof subId === "string" ? subId : subId.id)
    .maybeSingle();

  const userId = (subRow as any)?.user_id;
  if (!userId) return;

  // Idempotency: skip if a payment row already exists for this invoice
  const reference = `stripe_invoice:${invoice.id}`;
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing) return;

  const line = invoice.lines.data[0] as any;
  const periodStart = line?.period?.start;
  const periodEnd = line?.period?.end;
  const amount = invoice.amount_paid / 100;

  await supabaseAdmin.from("payments").insert({
    user_id: userId,
    kind: "subscription" as any,
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
}

async function handleEvent(env: StripeEnv, event: Stripe.Event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertSubscription(env, event.data.object as Stripe.Subscription);
      break;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const stripe = createStripeClient(env);
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        if (!sub.metadata?.userId && session.metadata?.userId) {
          await stripe.subscriptions.update(sub.id, {
            metadata: { ...sub.metadata, ...session.metadata },
          });
          sub.metadata = { ...sub.metadata, ...session.metadata };
        }
        await upsertSubscription(env, sub);
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      await recordPaymentFromInvoice(env, event.data.object as Stripe.Invoice);
      break;
    }
    default:
      break;
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = parseEnv(url);
        const signature = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!signature) return new Response("Missing signature", { status: 400 });

        let event: Stripe.Event;
        try {
          const stripe = createStripeClient(env);
          event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            getWebhookSecret(env),
          );
        } catch (err) {
          console.error("[webhook] signature verification failed:", err);
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          await handleEvent(env, event);
        } catch (err) {
          console.error(`[webhook] error handling ${event.type}:`, err);
          return new Response("handler error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
