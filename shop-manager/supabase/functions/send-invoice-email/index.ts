import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceEmailRequest {
  invoiceId: string;
  invoiceType: 'standard' | 'power_washing' | 'gunsmith';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  invoiceNumber: string;
  invoiceTotal: number;
  invoiceDueDate?: string;
  companyName?: string;
  pdfBase64?: string;
}

serve(async (req) => {
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey);
    
    const {
      invoiceId,
      invoiceType,
      recipientEmail,
      recipientName,
      subject,
      message,
      invoiceNumber,
      invoiceTotal,
      invoiceDueDate,
      companyName = "Our Company",
      pdfBase64
    }: SendInvoiceEmailRequest = await req.json();

    // Validate required fields
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Recipient email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!invoiceNumber) {
      return new Response(JSON.stringify({ error: "Invoice number is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Format the invoice total
    const formattedTotal = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(invoiceTotal || 0);

    // Build the HTML email template
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${companyName}</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Invoice ${invoiceNumber}</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
                Dear ${recipientName || 'Valued Customer'},
              </p>
              
              <div style="margin: 0 0 30px 0; color: #4b5563; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
              
              <!-- Invoice Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Invoice Number</span>
                          <span style="float: right; color: #111827; font-weight: 600;">${invoiceNumber}</span>
                        </td>
                      </tr>
                      ${invoiceDueDate ? `
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Due Date</span>
                          <span style="float: right; color: #111827; font-weight: 600;">${invoiceDueDate}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding-top: 12px;">
                          <span style="color: #6b7280; font-size: 14px;">Amount Due</span>
                          <span style="float: right; color: #3b82f6; font-weight: 700; font-size: 18px;">${formattedTotal}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">
                ${pdfBase64 ? 'Please find the invoice attached to this email.' : 'Please contact us if you have any questions about this invoice.'}
              </p>
              
              <p style="margin: 30px 0 0 0; color: #374151; font-size: 15px;">
                Thank you for your business!
              </p>
              
              <p style="margin: 8px 0 0 0; color: #374151; font-size: 15px; font-weight: 600;">
                ${companyName}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This invoice was sent by ${companyName}. If you have questions, please reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Build email options
    const emailOptions: any = {
      from: `${companyName} <onboarding@resend.dev>`,
      to: [recipientEmail],
      subject: subject || `Invoice ${invoiceNumber} from ${companyName}`,
      html: htmlContent,
    };

    // Add PDF attachment if provided
    if (pdfBase64) {
      emailOptions.attachments = [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: pdfBase64,
        }
      ];
    }

    console.log(`Sending invoice email to ${recipientEmail} for invoice ${invoiceNumber}`);

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error("Resend API error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Email sent successfully:", data);

    // Log the email send in the database (optional - for tracking)
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Update the invoice to mark it as sent via email
      if (invoiceType === 'power_washing') {
        await supabaseClient
          .from('power_washing_invoices')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('status', 'draft');
      } else if (invoiceType === 'standard') {
        await supabaseClient
          .from('invoices')
          .update({ 
            status: 'sent',
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .in('status', ['draft', 'pending']);
      }
    } catch (dbError) {
      console.error("Error updating invoice status:", dbError);
      // Don't fail the request if status update fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      data,
      message: `Invoice emailed successfully to ${recipientEmail}` 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-invoice-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
