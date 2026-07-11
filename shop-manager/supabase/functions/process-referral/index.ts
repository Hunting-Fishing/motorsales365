
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { referralId, action } = await req.json();
    
    if (!referralId) {
      throw new Error("Referral ID is required");
    }
    
    // Get the referral details
    const { data: referral, error: referralError } = await supabase
      .from('customer_referrals_view')
      .select('*')
      .eq('id', referralId)
      .single();
    
    if (referralError || !referral) {
      throw new Error("Referral not found");
    }
    
    let result;
    
    // Process the referral based on the action
    switch (action) {
      case 'convert':
        // Process the referral reward
        const { data: transactionId, error: processError } = await supabase
          .rpc('process_referral_reward', { referral_id: referralId });
        
        if (processError) {
          throw processError;
        }
        
        // Update loyalty points for the referrer
        const { data: loyaltyData, error: loyaltyError } = await supabase
          .from('customer_loyalty')
          .select('*')
          .eq('customer_id', referral.referrer_id)
          .single();
        
        if (loyaltyError && loyaltyError.code !== 'PGRST116') { // Not found
          throw loyaltyError;
        }
        
        const pointsToAdd = 100; // Default points for a referral
        
        if (loyaltyData) {
          // Update existing loyalty record
          await supabase
            .from('customer_loyalty')
            .update({
              current_points: loyaltyData.current_points + pointsToAdd,
              lifetime_points: loyaltyData.lifetime_points + pointsToAdd,
              updated_at: new Date().toISOString()
            })
            .eq('customer_id', referral.referrer_id);
        } else {
          // Create new loyalty record
          await supabase
            .from('customer_loyalty')
            .insert({
              customer_id: referral.referrer_id,
              current_points: pointsToAdd,
              lifetime_points: pointsToAdd
            });
        }
        
        result = {
          action: 'convert',
          status: 'success',
          transaction_id: transactionId,
          points_awarded: pointsToAdd
        };
        break;
      
      case 'cancel':
        // Update the referral status
        const { error: cancelError } = await supabase
          .from('customer_referrals')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', referralId);
        
        if (cancelError) {
          throw cancelError;
        }
        
        result = {
          action: 'cancel',
          status: 'success'
        };
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error processing referral:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});
