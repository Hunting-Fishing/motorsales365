import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

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
 * Create an embedded Stripe Checkout session for purchasing a Boost
 * against one of the seller's listings. Webhook activation reads
 * metadata.kind=="boost" and inserts a row into public.listing_boosts.
 */
export const createBoostCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    boostSlug: string;
    listingId: string;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (!/^[a-z0-9_]+$/.test(data.boostSlug)) throw new Error("Invalid boostSlug");
    if (!/^[0-9a-f-]{36}$/i.test(data.listingId)) throw new Error("Invalid listingId");
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    // Verify ownership of the listing
    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("id, user_id, title")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!listing) throw new Error("Listing not found");
    if ((listing as any).user_id !== userId) throw new Error("You don't own this listing");

    // Look up the boost product
    const { data: product, error: pErr } = await supabase
      .from("boost_products")
      .select("slug, label, stripe_lookup_key, recurring, active, duration_days")
      .eq("slug", data.boostSlug)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !(product as any).active) throw new Error("Boost not available");
    const lookupKey = (product as any).stripe_lookup_key as string | null;
    if (!lookupKey) throw new Error("Boost is not connected to a Stripe price yet");

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    if (!prices.data.length) throw new Error("Stripe price not found for boost");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const email = (claims as any)?.email as string | undefined;
    const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

    const productName = `${(product as any).label} — ${(listing as any).title}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      customer_update: { name: "auto", address: "auto" },
      metadata: {
        userId,
        kind: "boost",
        boostSlug: data.boostSlug,
        listingId: data.listingId,
        lookup_key: lookupKey,
      },
      ...(!isRecurring && {
        payment_intent_data: { description: productName },
      }),
      ...(isRecurring && {
        subscription_data: {
          metadata: {
            userId,
            kind: "boost",
            boostSlug: data.boostSlug,
            listingId: data.listingId,
            lookup_key: lookupKey,
          },
        },
      }),
    });

    return session.client_secret;
  });

/**
 * Return all active boost products. Public read.
 */
export const listBoostProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("boost_products")
    .select("slug, label, description, price_php, duration_days, recurring, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return { products: data ?? [] };
});
