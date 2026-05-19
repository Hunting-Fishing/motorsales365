import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function parseEnv(url: URL): StripeEnv {
  const v = url.searchParams.get("env");
  return v === "live" ? "live" : "sandbox";
}

async function upsertSubscription(env: StripeEnv, sub: Stripe.Subscription) {
  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  const lookupKey = (sub.metadata?.lookup_key as string | undefined) ?? null;

  if (!userId) return;

  // Resolve plan_id from lookup_key
  let planId: string | null = null;
  if (lookupKey) {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("stripe_lookup_key", lookupKey)
      .maybeSingle();
    planId = plan?.id ?? null;
  }
  if (!planId) {
    // Fallback: look up by price id
    const item = sub.items.data[0];
    if (item?.price?.lookup_key) {
      const { data: plan } = await supabaseAdmin
        .from("subscription_plans")
        .select("id")
        .eq("stripe_lookup_key", item.price.lookup_key)
        .maybeSingle();
      planId = plan?.id ?? null;
    }
  }
  if (!planId) {
    console.error("[webhook] could not resolve plan_id for subscription", sub.id);
    return;
  }

  const item = sub.items.data[0];
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

  // Upsert this subscription
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  const row = {
    user_id: userId,
    plan_id: planId,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    environment: env,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabaseAdmin.from("subscriptions").update(row).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert(row);
  }
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
        // Inherit metadata from the session if missing
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
