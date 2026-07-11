import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DonorReceiptRequest {
  donationId: string;
  donorEmail: string;
  donorName: string;
  donationAmount: number;
  donationDate: string;
  organizationName: string;
  taxExemptNumber?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { 
      donationId, 
      donorEmail, 
      donorName, 
      donationAmount, 
      donationDate,
      organizationName,
      taxExemptNumber 
    }: DonorReceiptRequest = await req.json();

    // Generate receipt number
    const { data: shopData } = await supabaseClient
      .from("profiles")
      .select("shop_id")
      .eq("id", (await supabaseClient.auth.getUser()).data.user?.id)
      .single();

    if (!shopData?.shop_id) {
      throw new Error("Shop not found");
    }

    const { data: receiptNumber } = await supabaseClient
      .rpc("generate_receipt_number", { shop_id_param: shopData.shop_id });

    // Create donor acknowledgment record
    const { error: insertError } = await supabaseClient
      .from("donor_acknowledgments")
      .insert({
        donation_id: donationId,
        receipt_number: receiptNumber,
        acknowledgment_type: "receipt",
        tax_deductible_amount: donationAmount,
        tax_year: new Date().getFullYear(),
        shop_id: shopData.shop_id,
        created_by: (await supabaseClient.auth.getUser()).data.user?.id || ""
      });

    if (insertError) {
      throw insertError;
    }

    // Generate receipt HTML
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Donation Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .receipt-details { margin: 20px 0; }
          .receipt-details table { width: 100%; border-collapse: collapse; }
          .receipt-details td { padding: 8px; border-bottom: 1px solid #eee; }
          .receipt-details td:first-child { font-weight: bold; width: 40%; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .tax-info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #007cba; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${organizationName}</h1>
          <h2>Official Donation Receipt</h2>
          <p><strong>Receipt #: ${receiptNumber}</strong></p>
        </div>

        <div class="receipt-details">
          <table>
            <tr>
              <td>Donor Name:</td>
              <td>${donorName}</td>
            </tr>
            <tr>
              <td>Donation Amount:</td>
              <td>$${donationAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Donation Date:</td>
              <td>${new Date(donationDate).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td>Receipt Date:</td>
              <td>${new Date().toLocaleDateString()}</td>
            </tr>
            ${taxExemptNumber ? `
            <tr>
              <td>Tax Exempt Number:</td>
              <td>${taxExemptNumber}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div class="tax-info">
          <h3>Important Tax Information</h3>
          <p>This receipt confirms your tax-deductible donation of $${donationAmount.toFixed(2)} to ${organizationName}. 
          No goods or services were provided in exchange for this contribution.</p>
          <p>Please retain this receipt for your tax records. Consult your tax advisor for specific deductibility information.</p>
        </div>

        <div class="footer">
          <p>Thank you for your generous support!</p>
          <p>This receipt was generated automatically on ${new Date().toLocaleDateString()}.</p>
          ${taxExemptNumber ? `<p>${organizationName} is a tax-exempt organization under section 501(c)(3) of the Internal Revenue Code. Tax ID: ${taxExemptNumber}</p>` : ''}
        </div>
      </body>
      </html>
    `;

    // Send email with receipt
    const emailResponse = await resend.emails.send({
      from: `${organizationName} <noreply@resend.dev>`,
      to: [donorEmail],
      subject: `Donation Receipt - ${receiptNumber}`,
      html: receiptHtml,
    });

    // Update acknowledgment record with email sent status
    await supabaseClient
      .from("donor_acknowledgments")
      .update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        generated_content: receiptHtml
      })
      .eq("receipt_number", receiptNumber);

    console.log("Donor receipt sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      receiptNumber,
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-donor-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);