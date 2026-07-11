
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
    
    // Get all documents with tags
    const { data: documents, error: docsError } = await supabase
      .from('customer_documents')
      .select('id, tags')
      .not('tags', 'is', null);
    
    if (docsError) {
      throw new Error(`Error fetching documents: ${docsError.message}`);
    }
    
    // Count unique tags and update document_tags table
    const tagCounts: Record<string, number> = {};
    
    documents?.forEach(doc => {
      if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // Process each tag
    const results = [];
    for (const [tag, count] of Object.entries(tagCounts)) {
      // Check if tag already exists
      const { data: existingTag, error: existingError } = await supabase
        .from('document_tags')
        .select('id, usage_count')
        .eq('name', tag)
        .maybeSingle();
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error(`Error checking tag ${tag}:`, existingError);
        continue;
      }
      
      if (existingTag) {
        // Update existing tag count
        const { data: updateData, error: updateError } = await supabase
          .from('document_tags')
          .update({ usage_count: count })
          .eq('id', existingTag.id)
          .select();
        
        if (updateError) {
          console.error(`Error updating tag ${tag}:`, updateError);
        } else {
          results.push({ tag, action: 'updated', count });
        }
      } else {
        // Insert new tag
        const { data: insertData, error: insertError } = await supabase
          .from('document_tags')
          .insert({ name: tag, usage_count: count })
          .select();
        
        if (insertError) {
          console.error(`Error inserting tag ${tag}:`, insertError);
        } else {
          results.push({ tag, action: 'inserted', count });
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${results.length} tags`,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error migrating document tags:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
