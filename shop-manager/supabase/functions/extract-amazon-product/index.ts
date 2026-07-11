
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const { amazonUrl } = await req.json();
    
    if (!amazonUrl || typeof amazonUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: "Amazon URL is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Function to extract ASIN from URL
    const extractAsin = (url: string): string | null => {
      // Try to extract ASIN from various URL patterns
      const patterns = [
        /\/dp\/([A-Z0-9]{10})/,
        /\/gp\/product\/([A-Z0-9]{10})/,
        /\/([A-Z0-9]{10})(?:\/|\?|$)/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      
      return null;
    };

    const asin = extractAsin(amazonUrl);
    
    if (!asin) {
      return new Response(
        JSON.stringify({ error: "Could not extract ASIN from URL" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // In a real-world scenario, you would use a product API or scraping technique
    // to get this information. For demo purposes, we'll return a placeholder response.
    // Note: Web scraping without permission may violate Amazon's terms of service.
    
    // Example of what this function would return with real data:
    const productInfo = {
      title: `Amazon Product (ASIN: ${asin})`,
      description: "Product description would appear here.",
      image_url: `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`,
      price: 29.99,  // Would be extracted from the page
      asin: asin
    };

    return new Response(
      JSON.stringify(productInfo),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in extract-amazon-product function:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
