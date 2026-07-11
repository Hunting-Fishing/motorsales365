
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@1.0.0";

// Get the Resend API key from the environment variables
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailCampaignRequest {
  campaignId: string;
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
    const { campaignId } = await req.json() as EmailCampaignRequest;

    // Validate request
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "Campaign ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the campaign from Supabase
    const { data: campaignData, error: campaignError } = await req.supabaseClient
      .from("email_campaigns")
      .select("*, email_templates!inner(*)")
      .eq("id", campaignId)
      .single();

    if (campaignError) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update campaign status to 'sending'
    const { error: updateError } = await req.supabaseClient
      .from("email_campaigns")
      .update({ 
        status: "sending",
        sent_date: new Date().toISOString()
      })
      .eq("id", campaignId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update campaign status" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get recipients for the campaign
    let recipientIds = campaignData.recipient_ids || [];
    
    // If segment IDs are specified, fetch those recipients
    if (campaignData.segment_ids && campaignData.segment_ids.length > 0) {
      const { data: segmentCustomers, error: segmentError } = await req.supabaseClient
        .from("customer_segment_assignments")
        .select("customer_id")
        .in("segment_id", campaignData.segment_ids);
        
      if (!segmentError && segmentCustomers) {
        const segmentCustomerIds = segmentCustomers.map(sc => sc.customer_id);
        recipientIds = [...new Set([...recipientIds, ...segmentCustomerIds])];
      }
    }
    
    // Fetch customer details for recipients
    const { data: customers, error: customersError } = await req.supabaseClient
      .from("customers")
      .select("id, email, first_name, last_name")
      .in("id", recipientIds);
      
    if (customersError) {
      return new Response(JSON.stringify({ error: "Failed to fetch recipients" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if A/B testing is enabled for this campaign
    const abTest = campaignData.ab_test;
    let isAbTestEnabled = abTest && abTest.enabled && Array.isArray(abTest.variants) && abTest.variants.length > 1;
    
    // If AB testing is enabled, prepare the variants
    let variants = [];
    let recipientCountsByVariant = {};
    
    if (isAbTestEnabled) {
      variants = abTest.variants;
      // Initialize recipient counts for tracking
      variants.forEach(variant => {
        recipientCountsByVariant[variant.id] = 0;
      });
      
      console.log(`A/B Testing enabled with ${variants.length} variants`);
    }

    // Use the campaign template to send emails
    const template = campaignData.email_templates;
    let sentCount = 0;
    let errorCount = 0;
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 50;
    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      // Send emails to each recipient in the batch
      const sendPromises = batch.map(async (customer) => {
        try {
          // Determine which variant to use if A/B testing is enabled
          let selectedVariant = null;
          let subject = campaignData.subject;
          let content = campaignData.content || template.content;
          let variantId = null;
          
          if (isAbTestEnabled) {
            // Assign variant based on percentages
            selectedVariant = assignVariantBasedOnPercentage(variants, recipientCountsByVariant, customers.length);
            
            if (selectedVariant) {
              subject = selectedVariant.subject;
              content = selectedVariant.content;
              variantId = selectedVariant.id;
              
              // Update count for this variant
              recipientCountsByVariant[variantId]++;
              
              console.log(`Customer ${customer.id} assigned to variant ${selectedVariant.name} (${variantId})`);
            }
          }
          
          // Personalize the email content
          let personalizedSubject = subject;
          let personalizedContent = content;
          
          // Apply basic personalization
          personalizedSubject = personalizedSubject
            .replace(/{{first_name}}/g, customer.first_name || "")
            .replace(/{{last_name}}/g, customer.last_name || "")
            .replace(/{{email}}/g, customer.email || "");
            
          personalizedContent = personalizedContent
            .replace(/{{first_name}}/g, customer.first_name || "")
            .replace(/{{last_name}}/g, customer.last_name || "")
            .replace(/{{email}}/g, customer.email || "");
            
          // Apply custom personalizations if any
          if (campaignData.personalizations) {
            const customVars = campaignData.personalizations[customer.id] || {};
            Object.entries(customVars).forEach(([key, value]) => {
              const regex = new RegExp(`{{${key}}}`, "g");
              personalizedSubject = personalizedSubject.replace(regex, value as string);
              personalizedContent = personalizedContent.replace(regex, value as string);
            });
          }
          
          // Add tracking pixel for open tracking
          const trackingId = crypto.randomUUID();
          const variantParam = variantId ? `&v=${variantId}` : '';
          const trackingPixel = `<img src="${Deno.env.get("SUPABASE_URL")}/functions/track-email-open?t=${trackingId}&c=${campaignId}&r=${customer.id}${variantParam}" width="1" height="1" alt="">`;
          
          // Add at the end of the email body
          if (personalizedContent.includes('</body>')) {
            personalizedContent = personalizedContent.replace('</body>', `${trackingPixel}</body>`);
          } else {
            personalizedContent = `${personalizedContent}${trackingPixel}`;
          }
          
          // Process links for click tracking
          // This is a simplified version - a full implementation would parse the HTML and modify all links
          const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^"']+)\1/gi;
          let match;
          while ((match = linkRegex.exec(personalizedContent)) !== null) {
            const originalUrl = match[2];
            const trackingUrl = `${Deno.env.get("SUPABASE_URL")}/functions/track-email-click?t=${trackingId}&c=${campaignId}&r=${customer.id}${variantParam}&u=${encodeURIComponent(originalUrl)}`;
            personalizedContent = personalizedContent.replace(`href="${originalUrl}"`, `href="${trackingUrl}"`);
          }
          
          // Store tracking info in the database
          const eventData = {
            tracking_id: trackingId,
            campaign_id: campaignId,
            recipient_id: customer.id,
            variant_id: variantId,
            sent_at: new Date().toISOString()
          };
          
          await req.supabaseClient
            .from("email_tracking")
            .insert(eventData);
            
          // Send the email using Resend
          const { data: emailData, error: emailError } = await resend.emails.send({
            from: `${campaignData.from_name || "Company"} <${campaignData.from_email || "noreply@example.com"}>`,
            to: customer.email,
            subject: personalizedSubject,
            html: personalizedContent
          });
          
          if (emailError) {
            console.error(`Failed to send email to ${customer.email}:`, emailError);
            errorCount++;
          } else {
            sentCount++;
            
            // Log successful send
            await req.supabaseClient
              .from("email_events")
              .insert({
                campaign_id: campaignId,
                recipient_id: customer.id,
                event_type: "sent",
                event_data: { 
                  email_id: emailData.id,
                  recipient: customer.email,
                  variant_id: variantId
                }
              });
          }
        } catch (err) {
          console.error(`Error sending to ${customer.email}:`, err);
          errorCount++;
        }
      });
      
      // Wait for all emails in this batch to be sent
      await Promise.all(sendPromises);
    }

    // If A/B testing was enabled, update the variant stats in the campaign
    if (isAbTestEnabled) {
      // Update the campaign with the actual recipient counts for each variant
      const updatedVariants = variants.map(variant => ({
        ...variant,
        recipients: recipientCountsByVariant[variant.id] || 0
      }));
      
      const updatedAbTest = {
        ...abTest,
        variants: updatedVariants
      };
      
      await req.supabaseClient
        .from("email_campaigns")
        .update({ 
          ab_test: updatedAbTest
        })
        .eq("id", campaignId);
        
      console.log("Updated A/B test variants with recipient counts:", recipientCountsByVariant);
    }

    // Create analytics entry or update existing one
    const now = new Date().toISOString();
    const { data: analyticsData, error: analyticsError } = await req.supabaseClient
      .from("email_campaign_analytics")
      .upsert({
        campaign_id: campaignId,
        name: campaignData.name,
        sent: sentCount,
        delivered: sentCount, // Assume all sent emails are delivered initially
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        unsubscribed: 0,
        created_at: now,
        updated_at: now
      }, { onConflict: 'campaign_id' })
      .select();

    // Update the campaign with total recipients and completion status
    await req.supabaseClient
      .from("email_campaigns")
      .update({ 
        total_recipients: sentCount,
        status: sentCount > 0 ? (errorCount > 0 ? "partial" : "completed") : "failed"
      })
      .eq("id", campaignId);

    return new Response(JSON.stringify({ 
      message: "Campaign sending completed",
      campaignId,
      sent: sentCount,
      errors: errorCount,
      total: customers.length,
      abTestApplied: isAbTestEnabled
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

/**
 * Assigns a variant to a recipient based on configured percentages
 * This ensures distribution matches the configured percentages while accounting for already sent emails
 */
function assignVariantBasedOnPercentage(variants, currentCounts, totalRecipients) {
  // If there's only one variant or no variants, return null or the only variant
  if (!variants || variants.length === 0) return null;
  if (variants.length === 1) return variants[0];

  // Calculate total current recipients
  const currentTotalRecipients = Object.values(currentCounts).reduce((sum, count) => sum + (count as number), 0) as number;
  
  // If we've already assigned all recipients, assign randomly according to percentages
  if (currentTotalRecipients >= totalRecipients) {
    return assignVariantRandomly(variants);
  }
  
  // Calculate the target count for each variant based on percentage
  const targetCounts = {};
  variants.forEach(variant => {
    targetCounts[variant.id] = Math.round((variant.recipientPercentage / 100) * totalRecipients);
  });
  
  // Find variants that haven't met their target count yet
  const eligibleVariants = variants.filter(variant => 
    (currentCounts[variant.id] || 0) < (targetCounts[variant.id] || 0)
  );
  
  // If all variants have met their targets, assign randomly
  if (eligibleVariants.length === 0) {
    return assignVariantRandomly(variants);
  }
  
  // Find the variant furthest from its target percentage
  let selectedVariant = eligibleVariants[0];
  let maxPercentageShortfall = -1;
  
  eligibleVariants.forEach(variant => {
    const currentPercentage = currentCounts[variant.id] / currentTotalRecipients * 100 || 0;
    const targetPercentage = variant.recipientPercentage;
    const shortfall = targetPercentage - currentPercentage;
    
    if (shortfall > maxPercentageShortfall) {
      maxPercentageShortfall = shortfall;
      selectedVariant = variant;
    }
  });
  
  return selectedVariant;
}

/**
 * Assigns a variant randomly based on configured percentages
 */
function assignVariantRandomly(variants) {
  const random = Math.random() * 100;
  let cumulativePercentage = 0;
  
  for (const variant of variants) {
    cumulativePercentage += variant.recipientPercentage;
    if (random <= cumulativePercentage) {
      return variant;
    }
  }
  
  // Fallback to the last variant if we somehow exceed 100%
  return variants[variants.length - 1];
}
