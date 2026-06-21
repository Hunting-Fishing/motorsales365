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
 * Create an embedded Stripe Checkout session for paying a pending listing's
 * publish fee (Standard or Upgraded tier). Pricing is read live from
 * `pricing_settings` so admin updates take effect without redeploying.
 * On webhook activation (kind=listing_payment), the listing flips to active
 * and a paid `payments` row is recorded.
 */
export const createListingPaymentCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      listingId: string;
      returnUrl: string;
      environment: StripeEnv;
      /** Force a single PH e-wallet rail (currently only `gcash`). When set,
       * Stripe shows the GCash flow directly instead of the full method picker. */
      paymentMethod?: "gcash";
    }) => {
      if (!/^[0-9a-f-]{36}$/i.test(data.listingId)) throw new Error("Invalid listingId");
      validateEnv(data.environment);
      validateReturnUrl(data.returnUrl);
      if (data.paymentMethod && data.paymentMethod !== "gcash") {
        throw new Error("Unsupported paymentMethod");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;

    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("id, user_id, title, plan, status")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!listing) throw new Error("Listing not found");
    const row = listing as any;
    if (row.user_id !== userId) throw new Error("You don't own this listing");
    if (row.status !== "pending_payment") {
      throw new Error("This listing is not awaiting payment");
    }
    const plan = row.plan as "free" | "standard" | "upgraded";
    if (plan === "free") throw new Error("Free listings don't require payment");

    // Live pricing from admin settings
    const { data: priceRows } = await supabase
      .from("pricing_settings")
      .select("key,value")
      .in("key", ["listing_fee_php", "upgrade_fee_php"]);
    const priceMap: Record<string, number> = {};
    (priceRows ?? []).forEach((r: any) => {
      priceMap[r.key] = Number(r.value);
    });
    const listingFee = priceMap["listing_fee_php"] ?? 20;
    const upgradeFee = priceMap["upgrade_fee_php"] ?? 100;
    const totalPhp = listingFee + (plan === "upgraded" ? upgradeFee : 0);
    if (totalPhp <= 0) throw new Error("Listing fee not configured");

    const unitAmount = Math.round(totalPhp * 100); // PHP centavos

    const tierLabel = plan === "upgraded" ? "Upgraded" : "Standard";
    const productName = `${tierLabel} listing — ${row.title}`;

    const stripe = createStripeClient(data.environment);
    const email = (claims as any)?.email as string | undefined;
    const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

    const forceGCash = data.paymentMethod === "gcash";

    // GCash-only sessions can't use managed_payments (incompatible with
    // payment_method_types). Fall back to automatic_tax in that case so we
    // still collect PH tax correctly.
    const railOptions = forceGCash
      ? { payment_method_types: ["gcash"], automatic_tax: { enabled: true } }
      : { managed_payments: { enabled: true } };

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "php",
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              // General digital service classification for Stripe Tax
              tax_code: "txcd_10000000",
            },
          },
        },
      ],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      ...railOptions,
      metadata: {
        userId,
        kind: "listing_payment",
        listingId: data.listingId,
        plan,
        productName,
        managed_payments: forceGCash ? "false" : "true",
        rail: forceGCash ? "gcash" : "all",
      },
    } as any);

    return session.client_secret;
  });

/**
 * Look up the status of a listing checkout session so the return page can
 * branch into a success/failure UI. We only return enough info to render
 * a message and a retry CTA — never raw Stripe payloads.
 */
export const getListingCheckoutStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { sessionId: string; environment: StripeEnv }) => {
    if (!/^cs_[a-zA-Z0-9_]+$/.test(data.sessionId)) throw new Error("Invalid sessionId");
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const stripe = createStripeClient(data.environment);
    const session = await stripe.checkout.sessions.retrieve(data.sessionId);
    if (session.metadata?.userId && session.metadata.userId !== userId) {
      throw new Error("Not your checkout session");
    }
    const listingId = (session.metadata?.listingId as string | undefined) ?? null;
    return {
      listingId,
      status: session.status ?? null, // "open" | "complete" | "expired"
      paymentStatus: session.payment_status ?? null, // "paid" | "unpaid" | "no_payment_required"
    };
  });
