import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminRole } from "@/integrations/supabase/admin-middleware";
import { type StripeEnv, createStripeClient, validateReturnUrl } from "@/lib/stripe.server";

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

function validateEnv(env: StripeEnv): StripeEnv {
  if (env !== "sandbox" && env !== "live") throw new Error("Invalid environment");
  return env;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { priceId: string; quantity?: number; returnUrl: string; environment: StripeEnv }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      validateEnv(data.environment);
      validateReturnUrl(data.returnUrl);
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const stripe = createStripeClient(data.environment);

    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const email = (claims as any)?.email as string | undefined;
    const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.full_name) {
      await stripe.customers.update(customerId, { name: profile.full_name });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      customer: customerId,
      // Stripe handles end-to-end tax/fraud/disputes globally on this session.
      // `managed_payments` is newer than the installed SDK typings — safe to cast.
      managed_payments: { enabled: true },
      metadata: { userId, lookup_key: data.priceId, managed_payments: "true" },
      ...(isRecurring && {
        subscription_data: { metadata: { userId, lookup_key: data.priceId } },
      }),
    } as any);

    return session.client_secret;
  });

/**
 * Modify an EXISTING Stripe subscription to a new plan.
 * - Upgrade: invoices the prorated difference immediately and charges the saved card.
 * - Downgrade: switches immediately, the unused portion is credited toward the next invoice.
 */
export const updateSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      priceId: string;
      environment: StripeEnv;
      mode: "upgrade" | "downgrade" | "switch";
    }) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
      validateEnv(data.environment);
      if (!["upgrade", "downgrade", "switch"].includes(data.mode)) {
        throw new Error("Invalid mode");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_subscription_id", "is", null)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      throw new Error("No active Stripe subscription to modify");
    }

    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) throw new Error("Subscription has no items");

    // Upgrades invoice the diff immediately; downgrades/switches create
    // a credit on the customer balance that applies to the next invoice.
    const prorationBehavior = data.mode === "upgrade" ? "always_invoice" : "create_prorations";

    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: stripePrice.id }],
      proration_behavior: prorationBehavior,
      payment_behavior: "error_if_incomplete",
      metadata: {
        ...(stripeSub.metadata || {}),
        userId,
        lookup_key: data.priceId,
      },
    });

    return { ok: true, subscriptionId: updated.id, status: updated.status };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; immediate?: boolean }) => {
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_subscription_id", "is", null)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No active subscription");

    if (data.immediate) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } else {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }
    return { ok: true };
  });

export const reactivateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => {
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No subscription to reactivate");

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    return { ok: true };
  });

export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv; limit?: number }) => {
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) return { invoices: [] };

    const invoices = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: Math.min(data.limit ?? 20, 50),
    });
    return {
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        created: inv.created,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
      })),
    };
  });

export const listPaymentMethods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => {
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return { paymentMethods: [], defaultPaymentMethodId: null as string | null };
    }

    const customerId = sub.stripe_customer_id as string;
    const [customer, methods] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.paymentMethods.list({ customer: customerId, limit: 20 }),
    ]);

    const defaultPmId = !("deleted" in customer && customer.deleted)
      ? (((customer as any).invoice_settings?.default_payment_method as string | null) ?? null)
      : null;

    return {
      defaultPaymentMethodId: defaultPmId,
      paymentMethods: methods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            }
          : null,
        billing_email: pm.billing_details?.email ?? null,
        isDefault: pm.id === defaultPmId,
      })),
    };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl?: string; environment: StripeEnv }) => {
    validateEnv(data.environment);
    validateReturnUrl(data.returnUrl, { required: false });
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) throw new Error("No saved payment method found yet");

    const stripe = createStripeClient(data.environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      ...(data.returnUrl && { return_url: data.returnUrl }),
    });
    return portal.url;
  });

/**
 * Admin-only: verify every active subscription plan's stripe_lookup_key
 * resolves to a real Stripe price in the given environment.
 * Returns one row per plan with status: ok | missing | inactive | no_key.
 */
export const verifyStripePlans = createServerFn({ method: "POST" })
  .middleware([requireAdminRole])
  .inputValidator((data: { environment: StripeEnv }) => {
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;



    const { data: plans, error: planErr } = await supabase
      .from("subscription_plans")
      .select("id, name, stripe_lookup_key, active, price_php")
      .order("sort_order");
    if (planErr) throw new Error(planErr.message);

    const stripe = createStripeClient(data.environment);
    const results: Array<{
      planId: string;
      name: string;
      lookupKey: string | null;
      status: "ok" | "missing" | "inactive" | "no_key";
      stripePriceId?: string;
      stripeAmount?: number;
      stripeCurrency?: string;
    }> = [];

    let allOk = true;
    for (const plan of plans ?? []) {
      if (!plan.stripe_lookup_key) {
        // Free / unpriced plans are fine without a Stripe key.
        results.push({
          planId: plan.id,
          name: plan.name,
          lookupKey: null,
          status: "no_key",
        });
        continue;
      }
      const prices = await stripe.prices.list({
        lookup_keys: [plan.stripe_lookup_key],
        active: true,
        limit: 1,
      });
      if (!prices.data.length) {
        const inactive = await stripe.prices.list({
          lookup_keys: [plan.stripe_lookup_key],
          active: false,
          limit: 1,
        });
        if (inactive.data.length) {
          allOk = false;
          results.push({
            planId: plan.id,
            name: plan.name,
            lookupKey: plan.stripe_lookup_key,
            status: "inactive",
            stripePriceId: inactive.data[0].id,
          });
        } else {
          allOk = false;
          results.push({
            planId: plan.id,
            name: plan.name,
            lookupKey: plan.stripe_lookup_key,
            status: "missing",
          });
        }
      } else {
        const price = prices.data[0];
        results.push({
          planId: plan.id,
          name: plan.name,
          lookupKey: plan.stripe_lookup_key,
          status: "ok",
          stripePriceId: price.id,
          stripeAmount: price.unit_amount ?? undefined,
          stripeCurrency: price.currency,
        });
      }
    }

    return { ok: allOk, environment: data.environment, results };
  });

export const setDefaultPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentMethodId: string; environment: StripeEnv }) => {
    if (!data.paymentMethodId || !data.paymentMethodId.startsWith("pm_")) {
      throw new Error("Invalid paymentMethodId");
    }
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) throw new Error("No customer found");

    await stripe.customers.update(sub.stripe_customer_id as string, {
      invoice_settings: { default_payment_method: data.paymentMethodId },
    });

    return { ok: true };
  });

export const detachPaymentMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentMethodId: string; environment: StripeEnv }) => {
    if (!data.paymentMethodId || !data.paymentMethodId.startsWith("pm_")) {
      throw new Error("Invalid paymentMethodId");
    }
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    // Verify the payment method belongs to this user by checking the customer
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) throw new Error("No customer found");

    const pm = await stripe.paymentMethods.retrieve(data.paymentMethodId);
    if (typeof pm.customer !== "string" || pm.customer !== sub.stripe_customer_id) {
      throw new Error("Payment method not found");
    }

    await stripe.paymentMethods.detach(data.paymentMethodId);
    return { ok: true };
  });

export const getInvoiceDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { invoiceId: string; environment: StripeEnv }) => {
    if (!data.invoiceId || !data.invoiceId.startsWith("in_")) {
      throw new Error("Invalid invoiceId");
    }
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const stripe = createStripeClient(data.environment);

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", data.environment)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) throw new Error("No customer found");

    const invoice = await stripe.invoices.retrieve(data.invoiceId, {
      expand: ["lines.data.price"],
    });

    if (
      typeof invoice.customer === "string"
        ? invoice.customer !== sub.stripe_customer_id
        : invoice.customer?.id !== sub.stripe_customer_id
    ) {
      throw new Error("Invoice not found");
    }

    const ZERO_DECIMAL_CURRENCIES = new Set([
      "bif",
      "clp",
      "djf",
      "gnf",
      "jpy",
      "kmf",
      "krw",
      "mga",
      "pyg",
      "rwf",
      "ugx",
      "vnd",
      "vuv",
      "xaf",
      "xof",
      "xpf",
    ]);
    const THREE_DECIMAL_CURRENCIES = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

    function toMajor(amount: number | null | undefined, currency: string): number {
      const v = amount ?? 0;
      const c = currency.toLowerCase();
      if (ZERO_DECIMAL_CURRENCIES.has(c)) return v;
      if (THREE_DECIMAL_CURRENCIES.has(c)) return v / 1000;
      return v / 100;
    }

    return {
      id: invoice.id,
      number: invoice.number ?? null,
      status: invoice.status ?? null,
      currency: invoice.currency,
      created: invoice.created ?? null,
      due_date: invoice.due_date ?? null,
      subtotal: toMajor(invoice.subtotal, invoice.currency),
      total: toMajor(invoice.total, invoice.currency),
      amount_paid: toMajor(invoice.amount_paid, invoice.currency),
      amount_due: toMajor(invoice.amount_due, invoice.currency),
      amount_remaining: toMajor(invoice.amount_remaining, invoice.currency),
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf: invoice.invoice_pdf ?? null,
      period_start: (invoice.lines?.data?.[0] as any)?.period?.start ?? null,
      period_end: (invoice.lines?.data?.[0] as any)?.period?.end ?? null,
      lines: (invoice.lines?.data ?? []).map((line: any) => ({
        id: line.id,
        description: line.description ?? "",
        quantity: line.quantity ?? 1,
        unit_amount: toMajor(line.unit_amount, invoice.currency),
        amount: toMajor(line.amount, invoice.currency),
        currency: invoice.currency,
        period_start: line.period?.start ?? null,
        period_end: line.period?.end ?? null,
      })),
    };
  });

/**
 * Admin-only: assign Stripe tax codes to every product backing an active
 * subscription plan or boost product. Required for Stripe's end-to-end
 * tax handling (`managed_payments`) to calculate VAT correctly.
 *
 * - Subscription plans → SaaS / electronic services (txcd_10103001)
 * - Boost products → general digital goods (txcd_10000000)
 *
 * Idempotent: skips products that already have a tax_code set.
 */
export const setStripeTaxCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => {
    validateEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Admin access required");

    const stripe = createStripeClient(data.environment);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: plans }, { data: boosts }] = await Promise.all([
      supabaseAdmin
        .from("subscription_plans")
        .select("stripe_lookup_key")
        .not("stripe_lookup_key", "is", null),
      supabaseAdmin
        .from("boost_products")
        .select("stripe_lookup_key")
        .not("stripe_lookup_key", "is", null),
    ]);

    const targets: Array<{ lookupKey: string; taxCode: string; kind: "plan" | "boost" }> = [];
    for (const p of plans ?? []) {
      if ((p as any).stripe_lookup_key) {
        targets.push({
          lookupKey: (p as any).stripe_lookup_key,
          taxCode: "txcd_10103001",
          kind: "plan",
        });
      }
    }
    for (const b of boosts ?? []) {
      if ((b as any).stripe_lookup_key) {
        targets.push({
          lookupKey: (b as any).stripe_lookup_key,
          taxCode: "txcd_10000000",
          kind: "boost",
        });
      }
    }

    const results: Array<{
      lookupKey: string;
      status: "set" | "already_set" | "missing" | "error";
      message?: string;
    }> = [];

    for (const t of targets) {
      try {
        const prices = await stripe.prices.list({ lookup_keys: [t.lookupKey], limit: 1 });
        if (!prices.data.length) {
          results.push({ lookupKey: t.lookupKey, status: "missing" });
          continue;
        }
        const productId =
          typeof prices.data[0].product === "string"
            ? prices.data[0].product
            : (prices.data[0].product as any)?.id;
        if (!productId) {
          results.push({ lookupKey: t.lookupKey, status: "error", message: "No product id" });
          continue;
        }
        const product = await stripe.products.retrieve(productId);
        if (product.tax_code) {
          results.push({ lookupKey: t.lookupKey, status: "already_set" });
          continue;
        }
        await stripe.products.update(productId, { tax_code: t.taxCode });
        results.push({ lookupKey: t.lookupKey, status: "set" });
      } catch (e: any) {
        results.push({ lookupKey: t.lookupKey, status: "error", message: e?.message ?? String(e) });
      }
    }

    return { ok: true, environment: data.environment, results };
  });
