
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@1.0.0";

// Get the Resend API key from the environment variables
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  email: string;
  subject: string;
  content: string;
  senderEmail?: string;
  senderName?: string;
  includeTracking?: boolean;
  abTestVariantId?: string;
  campaignId?: string;
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
    const { 
      email, 
      subject, 
      content, 
      senderEmail = "test@example.com", 
      senderName = "Test Email",
      includeTracking = false,
      abTestVariantId,
      campaignId
    } = await req.json() as TestEmailRequest;

    // Validate request
    if (!email) {
      return new Response(JSON.stringify({ error: "Recipient email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!subject) {
      return new Response(JSON.stringify({ error: "Subject is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!content) {
      return new Response(JSON.stringify({ error: "Email content is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let htmlContent = content;

    // Add tracking pixel and link tracking if requested
    if (includeTracking && campaignId) {
      const trackingId = crypto.randomUUID();
      
      // Add tracking pixel
      const trackingPixel = `<img src="${Deno.env.get("SUPABASE_URL")}/functions/track-email-open?t=${trackingId}&c=${campaignId}&r=test&v=${abTestVariantId || ''}" width="1" height="1" alt="" style="display:block">`;
      
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `${trackingPixel}</body>`);
      } else {
        htmlContent = `${htmlContent}${trackingPixel}`;
      }
      
      // Process links for click tracking
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^"']+)\1/gi;
      let match;
      while ((match = linkRegex.exec(htmlContent)) !== null) {
        const originalUrl = match[2];
        const trackingUrl = `${Deno.env.get("SUPABASE_URL")}/functions/track-email-click?t=${trackingId}&c=${campaignId}&r=test&v=${abTestVariantId || ''}&u=${encodeURIComponent(originalUrl)}`;
        htmlContent = htmlContent.replace(`href="${originalUrl}"`, `href="${trackingUrl}"`);
      }
    }

    // Add TEST prefix to subject to clearly identify test emails
    const testSubject = `[TEST] ${subject}`;

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: email,
      subject: testSubject,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend API error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ 
      data,
      message: "Test email sent successfully" 
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
