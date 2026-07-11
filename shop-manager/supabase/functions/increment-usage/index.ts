
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
    
    // Get request data
    const requestData = await req.json();
    const { template_id, template_type } = requestData;
    
    if (!template_id || !template_type) {
      throw new Error("Missing required parameters: template_id and template_type are required");
    }
    
    let result;
    
    if (template_type === 'invoice') {
      // Invoke the database function to increment the invoice template usage count
      const { data, error } = await supabase.rpc('increment_template_usage', { 
        template_id
      });
      
      if (error) throw error;
      result = { success: true, template_id, template_type };
    } 
    else if (template_type === 'work_order') {
      // Invoke the database function to increment the work order template usage count
      const { data, error } = await supabase.rpc('increment_usage_count', { 
        template_id
      });
      
      if (error) throw error;
      result = { success: true, template_id, template_type, new_count: data };
    }
    else {
      throw new Error(`Invalid template type: ${template_type}`);
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error incrementing template usage:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
