import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  checkUsageLimit, 
  logApiUsage, 
  calculateOpenAICost, 
  getShopTier,
  createLimitExceededResponse 
} from "../_shared/usage-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, shopId } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Check usage limits - scan-invoice uses GPT-4o (more expensive)
    // Count as 5 units since it's much more expensive than regular chat
    if (shopId) {
      const tierSlug = await getShopTier(shopId);
      const usageCheck = await checkUsageLimit(shopId, tierSlug, 'openai', 5);
      
      if (!usageCheck.allowed) {
        console.log(`Invoice scan blocked for shop ${shopId}: limit exceeded`);
        return createLimitExceededResponse('AI Invoice Scanning', usageCheck);
      }
    }

    console.log("Scanning invoice with OpenAI GPT-4o...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting product information from invoices and receipts. 
Extract all line items with their details. Return ONLY a valid JSON array with no markdown formatting.
Each item should have: part_number (or generate one if missing), description, quantity, unit_price, total_price, category (auto-classify based on description).
If any field is missing, use null. Ensure all prices are numbers without currency symbols.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all product line items from this invoice. Return as a JSON array."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        max_tokens: 4096
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "OpenAI rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key. Please check your configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("AI Response received");
    
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    
    // Log API usage - GPT-4o vision is expensive, estimate higher cost
    if (shopId) {
      // GPT-4o vision is roughly 10x more expensive than GPT-4o-mini
      const estimatedCost = calculateOpenAICost(tokensUsed) * 10;
      await logApiUsage({
        shopId,
        apiService: 'openai',
        functionName: 'scan-invoice',
        tokensUsed,
        unitsUsed: 5, // Count as 5 calls since it's expensive
        estimatedCostCents: estimatedCost,
        metadata: { model: 'gpt-4o', type: 'vision' }
      });
    }
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Clean the response - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7);
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    const products = JSON.parse(cleanedContent);

    if (!Array.isArray(products)) {
      throw new Error("AI response is not an array");
    }

    console.log("Extracted products:", products.length);

    return new Response(
      JSON.stringify({ products, tokens_used: tokensUsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in scan-invoice function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to scan invoice" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
