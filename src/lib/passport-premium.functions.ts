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
 * Embedded Stripe Checkout session for purchasing Passport Premium against a
 * vehicle owned by the user. Webhook activation reads metadata.kind=="passport_premium".
 */
export const createPassportPremiumCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { productSlug: string; vehicleId: string; returnUrl: string; environment: StripeEnv }) => {
      if (!/^[a-z0-9_]+$/.test(data.productSlug)) throw new Error("Invalid productSlug");
      if (!/^[0-9a-f-]{36}$/i.test(data.vehicleId)) throw new Error("Invalid vehicleId");
      validateEnv(data.environment);
      validateReturnUrl(data.returnUrl);
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    // Verify the vehicle belongs to the user
    const { data: vehicle, error: vErr } = await supabase
      .from("vehicles")
      .select("id, owner_user_id, year, make, model")
      .eq("id", data.vehicleId)
      .maybeSingle();
    if (vErr) throw new Error(vErr.message);
    if (!vehicle) throw new Error("Vehicle not found");
    if ((vehicle as any).owner_user_id !== userId) throw new Error("You don't own this vehicle");

    const { data: product, error: pErr } = await supabase
      .from("passport_premium_products")
      .select("slug, label, stripe_lookup_key, active")
      .eq("slug", data.productSlug)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!product || !(product as any).active) throw new Error("Premium not available");
    const lookupKey = (product as any).stripe_lookup_key as string | null;
    if (!lookupKey) throw new Error("Premium is not connected to a Stripe price yet");

    const stripe = createStripeClient(data.environment);
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    if (!prices.data.length) throw new Error("Stripe price not found for premium");
    const stripePrice = prices.data[0];

    const email = (claims as any)?.email as string | undefined;
    const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

    const v = vehicle as any;
    const vehicleLabel = [v.year, v.make, v.model].filter(Boolean).join(" ") || "Vehicle";
    const productName = `${(product as any).label} — ${vehicleLabel}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      managed_payments: { enabled: true },
      metadata: {
        userId,
        kind: "passport_premium",
        productSlug: data.productSlug,
        vehicleId: data.vehicleId,
        lookup_key: lookupKey,
        productName,
        managed_payments: "true",
      },
    } as any);

    return session.client_secret;
  });

/** Public read of active premium products. */
export const listPassportPremiumProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("passport_premium_products")
    .select("slug, label, description, price_php, duration_days, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return { products: data ?? [] };
});
