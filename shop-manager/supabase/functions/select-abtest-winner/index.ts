import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ABTestWinnerRequest {
  campaignId: string;
  forceWinnerId?: string;
  confidenceThreshold?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { campaignId, forceWinnerId, confidenceThreshold = 95 } = await req.json() as ABTestWinnerRequest;

    // Validate request
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "Campaign ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the campaign from Supabase
    const { data: campaign, error: campaignError } = await req.supabaseClient
      .from("email_campaigns")
      .select("ab_test, status")
      .eq("id", campaignId)
      .single();

    if (campaignError) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if A/B testing is enabled for this campaign
    if (!campaign.ab_test || !campaign.ab_test.enabled) {
      return new Response(JSON.stringify({ error: "A/B testing is not enabled for this campaign" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If a winner ID is already set, return it
    if (campaign.ab_test.winnerId) {
      const winner = campaign.ab_test.variants.find(v => v.id === campaign.ab_test.winnerId);
      return new Response(JSON.stringify({ 
        message: "Winner already selected",
        winner,
        winnerSelectionDate: campaign.ab_test.winnerSelectionDate,
        winnerCriteria: campaign.ab_test.winnerCriteria
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let winnerId;
    let confidenceLevel = null;

    // If force winner ID is provided, use it
    if (forceWinnerId) {
      winnerId = forceWinnerId;
    } else {
      // Otherwise, use the database function to calculate the winner
      const { data: calculatedWinnerId, error: calculationError } = await req.supabaseClient.rpc(
        "calculate_ab_test_winner",
        { 
          campaign_id: campaignId,
          criteria: campaign.ab_test.winnerCriteria 
        }
      );
      
      if (calculationError) {
        return new Response(JSON.stringify({ error: "Failed to calculate winner" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      winnerId = calculatedWinnerId;
      
      // Calculate the confidence level for the winner
      // This is a simplified example - a real implementation would use statistical methods
      const variants = campaign.ab_test.variants;
      if (variants.length >= 2 && winnerId) {
        const winner = variants.find(v => v.id === winnerId);
        const others = variants.filter(v => v.id !== winnerId);
        
        if (winner) {
          // Use conversion rates based on the winning criteria
          const getConversionRate = (variant) => {
            if (campaign.ab_test.winnerCriteria === 'open_rate') {
              return variant.recipients > 0 ? variant.opened / variant.recipients : 0;
            } else { // click_rate
              return variant.recipients > 0 ? variant.clicked / variant.recipients : 0;
            }
          };
          
          const winnerRate = getConversionRate(winner);
          const otherRates = others.map(v => getConversionRate(v));
          const highestOtherRate = Math.max(...otherRates);
          
          // Very simple confidence calculation - not statistically accurate
          // For a real implementation, use proper statistical tests
          if (winnerRate > 0 && highestOtherRate > 0) {
            const improvement = (winnerRate - highestOtherRate) / highestOtherRate;
            // Map improvement percentage to a confidence level (simplified)
            confidenceLevel = Math.min(99, Math.round(improvement * 100) + 80);
          } else if (winnerRate > 0) {
            confidenceLevel = 95; // Arbitrary high confidence when others have 0 rate
          } else {
            confidenceLevel = 50; // Low confidence when all rates are 0
          }
        }
      }
    }

    if (!winnerId) {
      return new Response(JSON.stringify({ error: "No winner could be determined" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if confidence threshold is met
    const proceedWithWinner = forceWinnerId || !confidenceLevel || confidenceLevel >= confidenceThreshold;
    
    if (!proceedWithWinner) {
      return new Response(JSON.stringify({ 
        message: "Confidence threshold not met",
        suggestedWinnerId: winnerId,
        confidenceLevel: confidenceLevel,
        requiredConfidence: confidenceThreshold
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update the campaign with the winner ID
    const now = new Date().toISOString();
    const { error: updateError } = await req.supabaseClient
      .from("email_campaigns")
      .update({ 
        ab_test: {
          ...campaign.ab_test,
          winnerId: winnerId,
          winnerSelectionDate: now
        }
      })
      .eq("id", campaignId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update campaign with winner" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Find the winner variant for the response
    const winner = campaign.ab_test.variants.find(v => v.id === winnerId);

    return new Response(JSON.stringify({ 
      message: "Winner selected successfully",
      winnerId,
      winner,
      winnerSelectionDate: now,
      confidenceLevel,
      winnerCriteria: campaign.ab_test.winnerCriteria
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
