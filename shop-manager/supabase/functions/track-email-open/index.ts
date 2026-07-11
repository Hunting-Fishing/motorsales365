
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  try {
    // Get parameters from URL
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("t");
    const campaignId = url.searchParams.get("c");
    const recipientId = url.searchParams.get("r");
    const variantId = url.searchParams.get("v");
    
    if (!trackingId || !campaignId) {
      return new Response("Invalid tracking parameters", { status: 400 });
    }
    
    console.log(`Email open tracked: tracking_id=${trackingId}, campaign=${campaignId}, recipient=${recipientId || 'unknown'}, variant=${variantId || 'none'}`);
    
    // Record the open event in the email_events table
    const { error: eventError } = await req.supabaseClient
      .from("email_events")
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: "opened",
        event_data: { 
          tracking_id: trackingId,
          timestamp: new Date().toISOString(),
          variant_id: variantId
        }
      });
      
    if (eventError) {
      console.error("Error recording open event:", eventError);
    }
    
    // Increment the campaign's open count
    await req.supabaseClient.rpc("increment_campaign_opens", { campaign_id: campaignId });
    
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
                opened: (variant.opened || 0) + 1
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
            
          console.log(`Updated A/B test variant ${variantId} open count`);
        }
      } catch (error) {
        console.error("Error updating A/B test variant stats:", error);
      }
    }
    
    // Return a transparent 1x1 pixel GIF
    const transparentPixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x01, 0x44, 0x00, 0x3b
    ]);

    return new Response(transparentPixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error) {
    console.error("Error processing email open:", error);
    
    // Return a transparent pixel even if there was an error
    const transparentPixel = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x00, 0x02, 0x01, 0x44, 0x00, 0x3b
    ]);

    return new Response(transparentPixel, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  }
});
