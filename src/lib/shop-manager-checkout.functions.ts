// Shop Manager checkout: create a Stripe embedded-checkout session for a
// business subscribing to a Shop Manager tier (starter / pro / enterprise
// × month / year). The webhook picks up metadata.kind === "shop_manager"
// and upserts a row into public.shop_manager_subscriptions.
import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
  validateReturnUrl,
} from "@/lib/stripe.server";

export type ShopManagerTier = "starter" | "pro" | "enterprise";
export type ShopManagerInterval = "month" | "year";

function lookupKey(tier: ShopManagerTier, interval: ShopManagerInterval): string {
  return `shopmgr_${tier}_${interval}`;
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
 * Create an embedded Stripe checkout session for a Shop Manager
 * subscription. The webhook uses metadata.kind === "shop_manager" to
 * upsert into shop_manager_subscriptions.
 */
export const createShopManagerCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      businessId: string;
      tier: ShopManagerTier;
      interval: ShopManagerInterval;
      countryCode?: string;
      returnUrl: string;
      environment: StripeEnv;
    }) => {
      if (!/^[0-9a-f-]{36}$/i.test(data.businessId)) throw new Error("Invalid businessId");
      if (!["starter", "pro", "enterprise"].includes(data.tier)) throw new Error("Invalid tier");
      if (!["month", "year"].includes(data.interval)) throw new Error("Invalid interval");
      if (data.environment !== "sandbox" && data.environment !== "live") {
        throw new Error("Invalid environment");
      }
      validateReturnUrl(data.returnUrl);
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { supabase, userId, claims } = context;

      // Verify caller owns or is a member of the business.
      const { data: biz, error: bErr } = await supabase
        .from("businesses")
        .select("id, owner_id, name")
        .eq("id", data.businessId)
        .maybeSingle();
      if (bErr) throw new Error(bErr.message);
      if (!biz) throw new Error("Business not found");

      let allowed = (biz as any).owner_id === userId;
      if (!allowed) {
        const { data: isMember } = await supabase.rpc("is_business_member", {
          _user: userId,
          _business: data.businessId,
        });
        allowed = !!isMember;
      }
      if (!allowed) throw new Error("You don't have access to this business");

      const stripe = createStripeClient(data.environment);
      const key = lookupKey(data.tier, data.interval);
      const prices = await stripe.prices.list({ lookup_keys: [key], limit: 1 });
      if (!prices.data.length) {
        return { error: `Price not configured for "${key}". Contact support.` };
      }
      const price = prices.data[0];

      const email = (claims as { email?: string } | null)?.email;
      const customerId = await resolveOrCreateCustomer(stripe, { email, userId });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: {
          userId,
          businessId: data.businessId,
          kind: "shop_manager",
          tier: data.tier,
          interval: data.interval,
          lookup_key: key,
          ...(data.countryCode && { countryCode: data.countryCode }),
        },
        subscription_data: {
          metadata: {
            userId,
            businessId: data.businessId,
            kind: "shop_manager",
            tier: data.tier,
            interval: data.interval,
            lookup_key: key,
            ...(data.countryCode && { countryCode: data.countryCode }),
          },
        },
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      console.error("createShopManagerCheckoutSession failed:", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Open the Stripe customer billing portal for the caller's current
 * Shop Manager subscription. Used by the pricing / dashboard "manage
 * subscription" button.
 */
export const createShopManagerPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.businessId)) throw new Error("Invalid businessId");
    if (d.environment !== "sandbox" && d.environment !== "live") throw new Error("Invalid environment");
    validateReturnUrl(d.returnUrl);
    return d;
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    try {
      const { supabase, userId } = context;
      const { data: sub } = await supabase
        .from("shop_manager_subscriptions")
        .select("stripe_customer_id, user_id, business_id")
        .eq("business_id", data.businessId)
        .maybeSingle();
      if (!sub || !(sub as any).stripe_customer_id) {
        return { error: "No active Shop Manager subscription for this business." };
      }
      if ((sub as any).user_id !== userId) {
        // Owner fallback — allow the business owner too.
        const { data: biz } = await supabase
          .from("businesses")
          .select("owner_id")
          .eq("id", data.businessId)
          .maybeSingle();
        if ((biz as any)?.owner_id !== userId) return { error: "Forbidden" };
      }
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: (sub as any).stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
