
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
    const { document_id, action, user_id, user_name } = requestData;
    
    if (!document_id || !action) {
      throw new Error("Missing required parameters: document_id and action are required");
    }
    
    // Record document change
    const { data, error } = await supabase
      .from('document_changes')
      .insert({
        document_id,
        action,
        user_id: user_id || null,
        user_name: user_name || null
      })
      .select();
    
    if (error) {
      throw new Error(`Error recording document change: ${error.message}`);
    }
    
    // Process tags if they are included with the document
    if (requestData.tags && Array.isArray(requestData.tags)) {
      for (const tag of requestData.tags) {
        // Check if the tag exists
        const { data: existingTag, error: tagError } = await supabase
          .from('document_tags')
          .select('name, usage_count')
          .eq('name', tag)
          .maybeSingle();
        
        if (tagError) {
          console.error(`Error checking tag ${tag}:`, tagError);
          continue;
        }
        
        if (existingTag) {
          // Tag exists, update its usage count
          await supabase
            .from('document_tags')
            .update({ usage_count: (existingTag.usage_count || 0) + 1 })
            .eq('name', tag);
        } else {
          // Tag doesn't exist, create it
          await supabase
            .from('document_tags')
            .insert({ name: tag, usage_count: 1 });
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document change recorded successfully",
        change_id: data?.[0]?.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error recording document change:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
