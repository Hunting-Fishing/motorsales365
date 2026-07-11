import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CHECKOUT-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    // Initialize Supabase client with service role for database updates
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Missing sessionId");
    }
    logStep("Request data received", { sessionId });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      status: session.payment_status,
      orderId: session.metadata?.order_id 
    });

    if (session.payment_status === 'paid') {
      // Update order status in database
      const orderId = session.metadata?.order_id;
      if (orderId) {
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({ 
            status: 'processing',
            payment_status: 'paid',
            stripe_session_id: sessionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (updateError) {
          logStep("Warning: Could not update order status", updateError);
        } else {
          logStep("Order status updated successfully");
        }

        // Create verification records for products in this order
        const { data: orderItems } = await supabaseClient
          .from('order_items')
          .select('product_id')
          .eq('order_id', orderId);

        if (orderItems && session.metadata?.user_id) {
          const verificationPromises = orderItems.map(item => 
            supabaseClient
              .from('verification_service')
              .upsert({
                user_id: session.metadata!.user_id,
                product_id: item.product_id,
                order_id: orderId,
                is_verified: true
              })
          );
          
          await Promise.all(verificationPromises);
          logStep("Verification records created");
        }
      }
    }

    return new Response(JSON.stringify({
      status: session.payment_status,
      orderId: session.metadata?.order_id,
      customerEmail: session.customer_details?.email
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-checkout-session", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});