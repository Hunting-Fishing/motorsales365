import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, validateReturnUrl } from "@/lib/stripe.server";

function validateEnv(env: StripeEnv): StripeEnv {
  if (env !== "sandbox" && env !== "live") throw new Error("Invalid environment");
  return env;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

/**
 * Create an embedded Stripe Checkout session for upgrading a business
 * directory listing. The webhook reads metadata.kind=="business" and
 * writes a row into public.business_subscriptions plus sets the
 * subscription_tier on the business.
 */
export const createBusinessSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    businessId: string;
    planSlug: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    if (!/^[a-z0-9_]+$/.test(data.planSlug)) throw new Error("Invalid planSlug");
    validateEnv(data.environment);
    validateReturnUrl(data.returnUrl);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    // Verify ownership of the business
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id, name, type_slug")
      .eq("id", data.businessId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!biz) throw new Error("Business not found");
    if ((biz as any).owner_id !== userId) throw new Error("You don't own this business");

    // Look up the plan
    const { data: plan, error: pErr } = await supabase
      .from("business_plans")
      .select("slug, tier, interval, price_php, stripe_lookup_key, active, description")
      .eq("slug", data.planSlug)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!plan || !(plan as any).active) throw new Error("Plan not available");
    const lookupKey = (plan as any).stripe_lookup_key as string;

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    if (!prices.data.length) throw new Error("Stripe price not found");
    const stripePrice = prices.data[0];

    const email = (claims as any)?.email as string | undefined;
    const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

    const productName = `${(plan as any).description ?? data.planSlug} — ${(biz as any).name}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      customer_update: { name: "auto", address: "auto" },
      metadata: {
        userId,
        kind: "business",
        businessId: data.businessId,
        planSlug: data.planSlug,
        lookup_key: lookupKey,
      },
      subscription_data: {
        description: productName,
        metadata: {
          userId,
          kind: "business",
          businessId: data.businessId,
          planSlug: data.planSlug,
          lookup_key: lookupKey,
        },
      },
    });

    return session.client_secret;
  });

/** List active plans available to a given business type. */
export const listBusinessPlansForType = createServerFn({ method: "GET" })
  .inputValidator((data: { typeSlug: string }) => {
    if (!/^[a-z0-9_]+$/.test(data.typeSlug)) throw new Error("Invalid typeSlug");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("business_plans")
      .select("slug, tier, interval, price_php, description, sort_order")
      .eq("active", true)
      .eq("type_slug", data.typeSlug)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { plans: rows ?? [] };
  });

/** Read the current business subscription (if any) for a business. */
export const getBusinessSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { businessId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("business_subscriptions")
      .select("id, plan_slug, tier, status, current_period_end, cancel_at_period_end, metadata, stripe_subscription_id")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { subscription: row ?? null };
  });

