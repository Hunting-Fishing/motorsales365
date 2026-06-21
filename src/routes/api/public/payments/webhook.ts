import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { createStripeClient, getWebhookSecret, type StripeEnv } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { alertOps } from "@/lib/alerting.server";
import {
  recordPaymentForInvoice,
  resolveInvoiceSubscriptionTarget,
} from "@/lib/payments-recording.server";

function parseEnv(url: URL): StripeEnv {
  const v = url.searchParams.get("env");
  return v === "live" ? "live" : "sandbox";
}

/**
 * Map a Checkout session's rail metadata onto the `payments.method` column.
 * Lets the admin payments log distinguish Stripe-GCash from card transactions
 * with a simple `method = 'stripe:gcash'` filter. Falls back to plain
 * `"stripe"` for anything that didn't force a specific rail.
 */
function methodForSession(session: Stripe.Checkout.Session | null | undefined): string {
  const rail = session?.metadata?.rail;
  if (rail === "gcash") return "stripe:gcash";
  return "stripe";
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
  // Business directory subscriptions live in business_subscriptions, not subscriptions.
  if (sub.metadata?.kind === "business") {
    await upsertBusinessSubscription(env, sub);
    return;
  }
  // Boost subscriptions are activated separately via checkout.session.completed.
  if (sub.metadata?.kind === "boost") return;

  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  const lookupKey = (sub.metadata?.lookup_key as string | undefined) ?? null;
  if (!userId) return;

  // 365 Dispatch subscriptions go to dispatch_subscriptions and toggle provider flags.
  const itemLookupKey = sub.items.data[0]?.price?.lookup_key ?? null;
  const dispatchLookup =
    (lookupKey && lookupKey.startsWith("dispatch_") ? lookupKey : null) ||
    (itemLookupKey && itemLookupKey.startsWith("dispatch_") ? itemLookupKey : null);
  if (sub.metadata?.kind === "dispatch" || dispatchLookup) {
    await upsertDispatchSubscription(env, sub, dispatchLookup);
    return;
  }

  const item = sub.items.data[0];
  const itemLookup = item?.price?.lookup_key ?? null;
  const planId = (await resolvePlanId(lookupKey)) ?? (await resolvePlanId(itemLookup));

  if (!planId) {
    console.error("[webhook] could not resolve plan_id for subscription", sub.id);
    void alertOps("payments.subscription.plan_unresolved", { subId: sub.id, lookupKey, itemLookup });
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
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    environment: env,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  } as any;

  if (existing) {
    await supabaseAdmin
      .from("subscriptions")
      .update(row)
      .eq("id", (existing as any).id);
  } else {
    await supabaseAdmin.from("subscriptions").insert(row);
  }
}

async function upsertDispatchSubscription(
  env: StripeEnv,
  sub: Stripe.Subscription,
  dispatchLookup: string | null,
) {
  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  if (!userId) return;
  const item = sub.items.data[0];
  const lookup = dispatchLookup ?? item?.price?.lookup_key ?? null;
  // Strip "_monthly" suffix for plan_slug stored in dispatch_subscriptions
  const planSlug = lookup ? lookup.replace(/_monthly$/, "") : "dispatch_solo";
  const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;
  const status = sub.status === "trialing" ? "active" : sub.status;
  const isActive = status === "active";

  const row = {
    user_id: userId,
    plan_slug: planSlug,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    environment: env,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    metadata: { lookup_key: lookup },
    updated_at: new Date().toISOString(),
  } as any;

  const { data: existing } = await supabaseAdmin
    .from("dispatch_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("dispatch_subscriptions")
      .update(row)
      .eq("id", (existing as any).id);
  } else {
    await supabaseAdmin.from("dispatch_subscriptions").insert(row);
  }

  // Auto-toggle dispatch_enabled on provider rates so the match function picks them up.
  await supabaseAdmin
    .from("provider_tow_rates")
    .upsert(
      { user_id: userId, dispatch_enabled: isActive, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
}



async function upsertBusinessSubscription(env: StripeEnv, sub: Stripe.Subscription) {
  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  const businessId = (sub.metadata?.businessId as string | undefined) ?? null;
  const planSlug = (sub.metadata?.planSlug as string | undefined) ?? null;
  if (!userId || !businessId) {
    console.error("[webhook] business sub missing metadata", sub.id);
    void alertOps("payments.business_sub.missing_metadata", { subId: sub.id, userId, businessId });
    return;
  }

  // Resolve plan_id + tier from planSlug, fall back to item lookup_key
  const item = sub.items.data[0];
  const itemLookup = item?.price?.lookup_key ?? null;
  let { data: plan } = planSlug
    ? await supabaseAdmin
        .from("business_plans")
        .select("id, tier, interval")
        .eq("slug", planSlug)
        .maybeSingle()
    : { data: null as any };
  if (!plan && itemLookup) {
    const r = await supabaseAdmin
      .from("business_plans")
      .select("id, tier, interval, slug")
      .eq("stripe_lookup_key", itemLookup)
      .maybeSingle();
    plan = r.data;
  }
  if (!plan) {
    console.error("[webhook] business plan not found for sub", sub.id);
    void alertOps("payments.business_sub.plan_not_found", { subId: sub.id, planSlug, itemLookup });
    return;
  }

  const periodEnd = (item as any)?.current_period_end ?? (sub as any).current_period_end;
  const isActive = sub.status === "active" || sub.status === "trialing";
  const status = isActive ? "active" : sub.status;

  const row = {
    business_id: businessId,
    owner_user_id: userId,
    plan_id: (plan as any).id,
    plan_slug: planSlug ?? (plan as any).slug,
    tier: (plan as any).tier,
    status,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    environment: env,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
    stripe_subscription_id: sub.id,
    stripe_price_id: item?.price?.id ?? null,
    metadata: { interval: (plan as any).interval },
    updated_at: new Date().toISOString(),
  } as any;

  const { data: existing } = await supabaseAdmin
    .from("business_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("business_subscriptions")
      .update(row)
      .eq("id", (existing as any).id);
  } else {
    await supabaseAdmin.from("business_subscriptions").insert(row);
  }

  // Mirror tier onto the business so the public directory reflects it instantly.
  await supabaseAdmin
    .from("businesses")
    .update({
      subscription_tier: isActive ? (plan as any).tier : "free",
      featured_until: isActive && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);
}

async function recordPaymentFromInvoice(env: StripeEnv, invoice: Stripe.Invoice) {
  void env;
  // Only record paid invoices
  if (invoice.status !== "paid") return;
  const subId = (invoice as any).subscription;
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!subId || !customerId) return;

  const stripeSubscriptionId = typeof subId === "string" ? subId : subId.id;

  // Renewal invoices can belong to a general subscription, a business
  // directory subscription, or a dispatch (towing provider) subscription —
  // each lives in its own table. Check all three before giving up.
  const target = await resolveInvoiceSubscriptionTarget(stripeSubscriptionId);
  if (!target) {
    console.error(
      "[webhook] Could not resolve subscription for invoice",
      invoice.id,
      stripeSubscriptionId,
    );
    void alertOps("payments.invoice.subscription_not_found", {
      invoiceId: invoice.id,
      stripeSubscriptionId,
    });
    return;
  }

  await recordPaymentForInvoice({ ...target, invoice });
}

async function activateBoostFromSession(env: StripeEnv, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  if (meta.kind !== "boost") return;
  const userId = meta.userId as string | undefined;
  const listingId = meta.listingId as string | undefined;
  const boostSlug = meta.boostSlug as string | undefined;
  if (!userId || !listingId || !boostSlug) {
    console.error("[webhook] boost session missing metadata", session.id);
    void alertOps("payments.boost.missing_metadata", { sessionId: session.id, userId, listingId, boostSlug });
    return;
  }

  // Idempotency: skip if we already activated this session
  const { data: existing } = await supabaseAdmin
    .from("listing_boosts")
    .select("id")
    .eq("listing_id", listingId)
    .eq("product_slug", boostSlug)
    .eq("user_id", userId)
    .gte("ends_at", new Date().toISOString())
    .maybeSingle();
  if (existing) return;

  // Look up duration
  const { data: product } = await supabaseAdmin
    .from("boost_products")
    .select("duration_days")
    .eq("slug", boostSlug)
    .maybeSingle();
  const days = ((product as any)?.duration_days as number | undefined) ?? 7;

  const now = new Date();
  const ends = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Record the payment
  const reference = `stripe_session:${session.id}`;
  const { data: payRow } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: userId,
      listing_id: listingId,
      kind: "boost" as any,
      status: "paid" as any,
      amount_php: (session.amount_total ?? 0) / 100,
      method: "stripe",
      reference,
      paid_at: new Date().toISOString(),
    } as any)
    .select("id")
    .maybeSingle();

  await supabaseAdmin.from("listing_boosts").insert({
    listing_id: listingId,
    user_id: userId,
    product_slug: boostSlug,
    starts_at: now.toISOString(),
    ends_at: ends.toISOString(),
    payment_id: (payRow as any)?.id ?? null,
  } as any);

  // Mirror onto legacy boost_until so existing UI/search still sees the boost,
  // and renew the listing's expires_at so a boost purchase also extends the ad.
  const { data: expirySetting } = await supabaseAdmin
    .from("pricing_settings")
    .select("value")
    .eq("key", "listing_expiry_days")
    .maybeSingle();
  const expiryDays = Number((expirySetting as any)?.value ?? 60) || 60;
  const newExpiry = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  await supabaseAdmin
    .from("listings")
    .update({
      boost_until: ends.toISOString(),
      expires_at: newExpiry.toISOString(),
    })
    .eq("id", listingId);
}

async function activatePassportPremiumFromSession(env: StripeEnv, session: Stripe.Checkout.Session) {
  void env;
  const meta = session.metadata || {};
  if (meta.kind !== "passport_premium") return;
  const userId = meta.userId as string | undefined;
  const vehicleId = meta.vehicleId as string | undefined;
  const productSlug = meta.productSlug as string | undefined;
  if (!userId || !vehicleId || !productSlug) {
    console.error("[webhook] passport_premium session missing metadata", session.id);
    void alertOps("payments.passport_premium.missing_metadata", { sessionId: session.id, userId, vehicleId, productSlug });
    return;
  }

  // Idempotency: skip if we already recorded this session
  const { data: existing } = await supabaseAdmin
    .from("passport_premium_purchases")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing) return;

  const { data: product } = await supabaseAdmin
    .from("passport_premium_products")
    .select("duration_days")
    .eq("slug", productSlug)
    .maybeSingle();
  const days = ((product as any)?.duration_days as number | undefined) ?? 365;

  // Extend from current premium expiry if it's still in the future, else from now
  const { data: vehicleRow } = await supabaseAdmin
    .from("vehicles")
    .select("passport_premium_until")
    .eq("id", vehicleId)
    .maybeSingle();
  const now = new Date();
  const existingUntil = (vehicleRow as any)?.passport_premium_until
    ? new Date((vehicleRow as any).passport_premium_until)
    : null;
  const base = existingUntil && existingUntil > now ? existingUntil : now;
  const newUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  const reference = `stripe_session:${session.id}`;
  const { data: payRow, error: payError } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: userId,
      kind: "passport_premium" as any,
      status: "paid" as any,
      amount_php: (session.amount_total ?? 0) / 100,
      method: "stripe",
      reference,
      paid_at: new Date().toISOString(),
    } as any)
    .select("id")
    .maybeSingle();

  if (payError) {
    console.error("[webhook] passport_premium payments insert failed", payError, session.id);
    void alertOps("payments.passport_premium.insert_failed", {
      sessionId: session.id,
      userId,
      vehicleId,
      productSlug,
      error: payError.message,
    });
  }

  await supabaseAdmin.from("passport_premium_purchases").insert({
    vehicle_id: vehicleId,
    user_id: userId,
    product_slug: productSlug,
    starts_at: now.toISOString(),
    ends_at: newUntil.toISOString(),
    payment_id: (payRow as any)?.id ?? null,
    stripe_session_id: session.id,
  } as any);

  await supabaseAdmin
    .from("vehicles")
    .update({
      passport_premium: true,
      passport_premium_until: newUntil.toISOString(),
    } as any)
    .eq("id", vehicleId);
}

async function activateListingFromSession(env: StripeEnv, session: Stripe.Checkout.Session) {
  void env;
  const meta = session.metadata || {};
  const userId = meta.userId as string | undefined;
  const listingId = meta.listingId as string | undefined;
  const plan = (meta.plan as string | undefined) ?? "standard";
  if (!userId || !listingId) {
    console.error("[webhook] listing_payment missing metadata", session.id);
    void alertOps("payments.listing.missing_metadata", { sessionId: session.id, userId, listingId });
    return;
  }

  // Idempotency: skip if we already recorded a payment for this session
  const reference = `stripe_session:${session.id}`;
  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existingPayment) return;

  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("id, user_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || (listing as any).user_id !== userId) {
    console.error("[webhook] listing_payment: listing not found / owner mismatch", listingId);
    void alertOps("payments.listing.owner_mismatch", { sessionId: session.id, listingId, userId });
    return;
  }

  await supabaseAdmin.from("payments").insert({
    user_id: userId,
    listing_id: listingId,
    kind: (plan === "upgraded" ? "upgrade" : "listing") as any,
    status: "paid" as any,
    amount_php: (session.amount_total ?? 0) / 100,
    method: "stripe",
    reference,
    paid_at: new Date().toISOString(),
    new_plan: plan,
  } as any);

  // Only flip pending listings live; never resurrect a hidden/sold one
  if ((listing as any).status === "pending_payment") {
    await supabaseAdmin
      .from("listings")
      .update({
        status: "active",
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);
  }
}

async function recordFailedListingPayment(
  env: StripeEnv,
  session: Stripe.Checkout.Session,
  reason: "expired" | "failed",
) {
  void env;
  const meta = session.metadata || {};
  if (meta.kind !== "listing_payment") return;
  const userId = meta.userId as string | undefined;
  const listingId = meta.listingId as string | undefined;
  const plan = (meta.plan as string | undefined) ?? "standard";
  if (!userId || !listingId) return;

  // Idempotency: one failed payment row per session
  const reference = `stripe_session_failed:${session.id}`;
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing) return;

  await supabaseAdmin.from("payments").insert({
    user_id: userId,
    listing_id: listingId,
    kind: (plan === "upgraded" ? "upgrade" : "listing") as any,
    status: "failed" as any,
    amount_php: (session.amount_total ?? 0) / 100,
    method: "stripe",
    reference,
    new_plan: plan,
    notes: reason === "expired" ? "Checkout session expired" : "Payment failed",
  } as any);
  // NOTE: We deliberately leave the listing in `pending_payment` so the seller
  // can retry from /listing/checkout?listingId=... without losing their draft.
}



async function enrollCourseFromSession(env: StripeEnv, session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const userId = meta.userId as string | undefined;
  const courseId = meta.courseId as string | undefined;
  if (!userId || !courseId) {
    console.error("[webhook] course session missing metadata", session.id);
    void alertOps("payments.course.missing_metadata", { sessionId: session.id, userId, courseId });
    return;
  }
  // Idempotent insert: unique(user_id, course_id) handles duplicate webhooks
  const reference = `stripe_session:${session.id}`;
  const { data: existingPayment } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reference", reference)
    .maybeSingle();
  let paymentId: string | null = (existingPayment as any)?.id ?? null;
  if (!paymentId) {
    const { data: payRow } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
        kind: "course" as any,
        status: "paid" as any,
        amount_php: (session.amount_total ?? 0) / 100,
        method: "stripe",
        reference,
        paid_at: new Date().toISOString(),
      } as any)
      .select("id")
      .maybeSingle();
    paymentId = (payRow as any)?.id ?? null;
  }
  await supabaseAdmin.from("course_enrollments").upsert(
    {
      user_id: userId,
      course_id: courseId,
      source: "purchase",
      payment_id: paymentId,
      stripe_session_id: session.id,
    },
    { onConflict: "user_id,course_id" },
  );
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
      if (session.metadata?.kind === "boost") {
        await activateBoostFromSession(env, session);
        break;
      }
      if (session.metadata?.kind === "passport_premium") {
        await activatePassportPremiumFromSession(env, session);
        break;
      }
      if (session.metadata?.kind === "course") {
        await enrollCourseFromSession(env, session);
        break;
      }
      if (session.metadata?.kind === "listing_payment") {
        await activateListingFromSession(env, session);
        break;
      }
      if (session.mode === "subscription" && session.subscription) {
        const stripe = createStripeClient(env);
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
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
    case "checkout.session.expired": {
      await recordFailedListingPayment(
        env,
        event.data.object as Stripe.Checkout.Session,
        "expired",
      );
      break;
    }
    case "checkout.session.async_payment_failed": {
      await recordFailedListingPayment(
        env,
        event.data.object as Stripe.Checkout.Session,
        "failed",
      );
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
          event = await stripe.webhooks.constructEventAsync(body, signature, getWebhookSecret(env));
        } catch (err) {
          console.error("[webhook] signature verification failed:", err);
          void alertOps("payments.webhook.signature_invalid", { env, err });
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          await handleEvent(env, event);
        } catch (err) {
          console.error(`[webhook] error handling ${event.type}:`, err);
          void alertOps("payments.webhook.handler_error", { env, type: event.type, id: event.id, err });
          return new Response("handler error", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
