import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-MODULE-CHECKOUT] ${step}${detailsStr}`);
};

// Multi-module discount: 20% off each additional module
const MULTI_MODULE_DISCOUNT_PERCENT = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { moduleSlug, tier, priceId } = await req.json();
    if (!moduleSlug || !priceId || !tier) {
      throw new Error("Module slug, tier, and price ID are required");
    }
    logStep("Request data", { moduleSlug, tier, priceId });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    let existingSubscriptionCount = 0;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });

      // Count existing active subscriptions at the same tier for discount
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 100,
      });
      
      existingSubscriptionCount = existingSubs.data.length;
      logStep("Existing subscription count", { count: existingSubscriptionCount });
    }

    const origin = req.headers.get("origin") || "https://oudkbrnvommbvtuispla.lovableproject.com";
    
    // Calculate discount for multi-module purchase
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    
    if (existingSubscriptionCount > 0) {
      // Create a coupon for the discount
      try {
        const coupon = await stripe.coupons.create({
          percent_off: MULTI_MODULE_DISCOUNT_PERCENT,
          duration: 'forever',
          name: `Multi-Module Discount (${MULTI_MODULE_DISCOUNT_PERCENT}% off)`,
        });
        discounts = [{ coupon: coupon.id }];
        logStep("Created discount coupon", { couponId: coupon.id, percentOff: MULTI_MODULE_DISCOUNT_PERCENT });
      } catch (couponError) {
        logStep("Could not create coupon, proceeding without discount", { error: String(couponError) });
      }
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      discounts,
      success_url: `${origin}/settings?tab=modules&success=true&module=${moduleSlug}`,
      cancel_url: `${origin}/settings?tab=modules&canceled=true`,
      metadata: {
        user_id: user.id,
        module_slug: moduleSlug,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          module_slug: moduleSlug,
          tier: tier,
        },
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      hasDiscount: !!discounts 
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
