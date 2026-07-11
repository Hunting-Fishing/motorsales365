
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  try {
    // Get parameters from URL
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("t");
    const campaignId = url.searchParams.get("c");
    const recipientId = url.searchParams.get("r");
    const variantId = url.searchParams.get("v");
    const redirectUrl = url.searchParams.get("u");
    
    if (!trackingId || !campaignId || !recipientId || !redirectUrl) {
      return new Response("Invalid tracking parameters", { status: 400 });
    }
    
    console.log(`Email link clicked: tracking_id=${trackingId}, campaign=${campaignId}, recipient=${recipientId}, variant=${variantId || 'none'}`);
    
    // Record the click event
    const { error: eventError } = await req.supabaseClient
      .from("email_events")
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: "clicked",
        event_data: { 
          tracking_id: trackingId,
          timestamp: new Date().toISOString(),
          url: redirectUrl,
          variant_id: variantId
        }
      });
      
    if (eventError) {
      console.error("Error recording click event:", eventError);
    }
    
    // Increment the campaign's click count
    await req.supabaseClient.rpc("increment_campaign_clicks", { campaign_id: campaignId });
    
    // If this is part of an A/B test, update the variant stats
    if (variantId) {
      try {
        // Get the current campaign data
        const { data: campaign, error: campaignError } = await req.supabaseClient
          .from("email_campaigns")
          .select("ab_test")
          .eq("id", campaignId)
          .single();
          
        if (!campaignError && campaign && campaign.ab_test && campaign.ab_test.variants) {
          const updatedVariants = campaign.ab_test.variants.map(variant => {
            if (variant.id === variantId) {
              return {
                ...variant,
                clicked: (variant.clicked || 0) + 1
              };
            }
            return variant;
          });
          
          // Update the campaign with the new variant stats
          await req.supabaseClient
            .from("email_campaigns")
            .update({
              ab_test: {
                ...campaign.ab_test,
                variants: updatedVariants
              }
            })
            .eq("id", campaignId);
            
          console.log(`Updated A/B test variant ${variantId} click count`);
        }
      } catch (error) {
        console.error("Error updating A/B test variant stats:", error);
      }
    }
    
    // Redirect to the original URL
    return new Response(null, {
      status: 302,
      headers: {
        "Location": redirectUrl,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    console.error("Error processing email click:", error);
    
    // If there's an error, redirect to the original URL if available, or a fallback
    const url = new URL(req.url);
    const redirectUrl = url.searchParams.get("u") || "/";
    
    return new Response(null, {
      status: 302,
      headers: {
        "Location": redirectUrl,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }
});
