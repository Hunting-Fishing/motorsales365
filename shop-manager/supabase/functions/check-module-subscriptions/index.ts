import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-MODULE-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

// Map Stripe product IDs to module slugs and tiers
const PRODUCT_TO_MODULE_TIER: Record<string, { slug: string; tier: string }> = {
  // Repair Shop (automotive)
  'prod_TkHbDuJAyUjch9': { slug: 'automotive', tier: 'starter' },
  'prod_TkHbtje5K3hM3U': { slug: 'automotive', tier: 'pro' },
  'prod_TkHcZz0EzbYhgo': { slug: 'automotive', tier: 'business' },
  // Power Washing
  'prod_TkHcOEGODLugmr': { slug: 'power_washing', tier: 'starter' },
  'prod_TkHd4ad9qrOr4F': { slug: 'power_washing', tier: 'pro' },
  'prod_TkHeGx5u9HzVKa': { slug: 'power_washing', tier: 'business' },
  // Gunsmith
  'prod_TkHe0kPKdXohND': { slug: 'gunsmith', tier: 'starter' },
  'prod_TkHfY1ts1YgObv': { slug: 'gunsmith', tier: 'pro' },
  'prod_TkHfPTROuIdUkb': { slug: 'gunsmith', tier: 'business' },
  // Marine
  'prod_TkHfgZQcYSUY8C': { slug: 'marine', tier: 'starter' },
  'prod_TkHgia4T6L17EG': { slug: 'marine', tier: 'pro' },
  'prod_TkHgJD3fYTBFKb': { slug: 'marine', tier: 'business' },
  // Legacy products (single tier)
  'prod_TjQuamW7bXdlp9': { slug: 'automotive', tier: 'business' },
  'prod_TjQvjdaBkKsCDF': { slug: 'power_washing', tier: 'business' },
  'prod_TjQv4acpfPjNlA': { slug: 'gunsmith', tier: 'business' },
  'prod_TjQwLR1WwHrnDx': { slug: 'marine', tier: 'business' },
};

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a platform developer
    const { data: platformDev } = await supabaseClient
      .from('platform_developers')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const isPlatformDeveloper = !!platformDev;
    logStep("Platform developer check", { isPlatformDeveloper });

    // Get user's shop
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (!profile?.shop_id) {
      logStep("No shop found for user");
      return new Response(JSON.stringify({ 
        subscriptions: [],
        trial_active: false,
        trial_ends_at: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get shop trial info
    const { data: shop } = await supabaseClient
      .from('shops')
      .select('trial_started_at, trial_days')
      .eq('id', profile.shop_id)
      .single();

    let trialActive = false;
    let trialEndsAt: string | null = null;

    if (shop?.trial_started_at) {
      const trialEnd = new Date(shop.trial_started_at);
      trialEnd.setDate(trialEnd.getDate() + (shop.trial_days || 30));
      trialEndsAt = trialEnd.toISOString();
      trialActive = new Date() < trialEnd;
    }

    logStep("Trial status", { trialActive, trialEndsAt });

    // Get shop enabled modules - these determine which modules the shop has access to
    const { data: enabledModules } = await supabaseClient
      .from('shop_enabled_modules')
      .select('module_id, business_modules(slug)')
      .eq('shop_id', profile.shop_id);

    const enabledModuleSlugs = enabledModules?.map(em => 
      (em.business_modules as any)?.slug
    ).filter(Boolean) || [];

    logStep("Enabled modules for shop", { enabledModuleSlugs });

    // Platform developers get access to ALL modules
    if (isPlatformDeveloper) {
      // Get all module slugs from the database
      const { data: allModules } = await supabaseClient
        .from('business_modules')
        .select('slug');
      
      const allModuleSlugs = allModules?.map(m => m.slug) || [];
      logStep("Platform developer - granting access to all modules", { allModuleSlugs });

      return new Response(JSON.stringify({
        subscriptions: [],
        trial_active: true, // Give trial-like access
        trial_ends_at: null,
        enabled_modules: allModuleSlugs,
        is_platform_developer: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscriptions: [],
        trial_active: trialActive,
        trial_ends_at: trialEndsAt,
        enabled_modules: enabledModuleSlugs,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 100,
    });

    const activeModules: Array<{
      module_slug: string;
      subscription_id: string;
      current_period_end: string;
      status: string;
      tier: string;
      product_id: string;
    }> = [];

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const productId = item.price.product as string;
        const moduleInfo = PRODUCT_TO_MODULE_TIER[productId];
        
        if (moduleInfo) {
          activeModules.push({
            module_slug: moduleInfo.slug,
            subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            status: sub.status,
            tier: moduleInfo.tier,
            product_id: productId,
          });
        } else if (sub.metadata?.module_slug) {
          // Fallback for subscriptions with metadata
          activeModules.push({
            module_slug: sub.metadata.module_slug,
            subscription_id: sub.id,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            status: sub.status,
            tier: sub.metadata.tier || 'pro',
            product_id: productId,
          });
        }
      }
    }

    logStep("Active module subscriptions", { 
      count: activeModules.length, 
      modules: activeModules.map(m => `${m.module_slug}:${m.tier}`) 
    });

    // Sync to database
    for (const mod of activeModules) {
      const { data: moduleData } = await supabaseClient
        .from('business_modules')
        .select('id')
        .eq('slug', mod.module_slug)
        .single();

      if (moduleData) {
        await supabaseClient
          .from('module_subscriptions')
          .upsert({
            shop_id: profile.shop_id,
            module_id: moduleData.id,
            stripe_subscription_id: mod.subscription_id,
            stripe_customer_id: customerId,
            status: 'active',
            current_period_end: mod.current_period_end,
            tier: mod.tier,
          }, {
            onConflict: 'shop_id,module_id',
          });
      }
    }

    // Get current usage for this period
    const { data: usageData } = await supabaseClient
      .from('module_usage')
      .select('*')
      .eq('shop_id', profile.shop_id);

    return new Response(JSON.stringify({
      subscriptions: activeModules,
      trial_active: trialActive,
      trial_ends_at: trialEndsAt,
      usage: usageData || [],
      enabled_modules: enabledModuleSlugs,
    }), {
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
