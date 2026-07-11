import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-PAYMENT] ${step}${detailsStr}`);
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

    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) {
      throw new Error("Missing payment_intent_id");
    }
    logStep("Payment intent ID received", { payment_intent_id });

    // Initialize Stripe
    const stripe = new (await import("https://esm.sh/stripe@14.21.0")).default(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    logStep("Payment intent retrieved", { 
      status: paymentIntent.status, 
      amount: paymentIntent.amount 
    });

    // Get the order associated with this payment
    const orderId = paymentIntent.metadata.order_id;
    if (!orderId) {
      throw new Error("No order ID found in payment intent metadata");
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }
    logStep("Order found", { orderNumber: order.order_number });

    // Update order based on payment status
    let orderUpdate: any = {
      stripe_payment_intent_id: payment_intent_id,
    };

    if (paymentIntent.status === 'succeeded') {
      orderUpdate.payment_status = 'paid';
      orderUpdate.status = 'processing';
      orderUpdate.completed_at = new Date().toISOString();
      logStep("Payment succeeded, updating order to processing");
    } else if (paymentIntent.status === 'payment_failed') {
      orderUpdate.payment_status = 'failed';
      logStep("Payment failed");
    } else {
      orderUpdate.payment_status = 'unpaid';
      logStep("Payment still pending");
    }

    // Update the order
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update(orderUpdate)
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // If payment succeeded, record status history
    if (paymentIntent.status === 'succeeded') {
      const { error: historyError } = await supabaseClient
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'processing',
          notes: 'Payment confirmed and order moved to processing',
        });

      if (historyError) {
        logStep("Warning: Could not record status history", historyError);
      }
    }

    logStep("Order updated successfully");

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      payment_status: paymentIntent.status,
      order_status: orderUpdate.status || order.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in confirm-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});