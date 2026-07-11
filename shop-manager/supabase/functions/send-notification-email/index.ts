import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationEmailRequest {
  type: 'grant_deadline' | 'budget_alert' | 'volunteer_reminder' | 'board_meeting';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  data: {
    programName?: string;
    grantTitle?: string;
    deadline?: string;
    budgetPercentage?: number;
    volunteerHours?: number;
    meetingDate?: string;
    [key: string]: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📧 Nonprofit notification email function called');

    if (req.method === 'POST') {
      const requestData: NotificationEmailRequest = await req.json();
      const { type, recipientEmail, recipientName, subject, data } = requestData;

      // Generate email content based on notification type
      const emailContent = generateEmailContent(type, recipientName, data);

      const emailResponse = await resend.emails.send({
        from: "NonProfit Management <notifications@yourdomain.com>",
        to: [recipientEmail],
        subject: subject,
        html: emailContent,
      });

      // Log the notification in the database
      await supabaseClient
        .from('notification_logs')
        .insert({
          notification_type: type,
          recipient_email: recipientEmail,
          subject: subject,
          sent_at: new Date().toISOString(),
          email_id: emailResponse.data?.id,
          status: 'sent'
        });

      console.log('✅ Notification email sent successfully:', emailResponse.data?.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          emailId: emailResponse.data?.id,
          message: 'Notification sent successfully' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle GET request for testing
    return new Response(
      JSON.stringify({ message: 'Nonprofit notification service ready' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in notification email function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notification',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateEmailContent(type: string, recipientName: string, data: any): string {
  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
      .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
      .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      .alert { padding: 15px; border-radius: 6px; margin: 15px 0; }
      .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
      .alert-danger { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
      .alert-info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
    </style>
  `;

  switch (type) {
    case 'grant_deadline':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📅 Grant Deadline Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <div class="alert alert-warning">
              <strong>Important Deadline Approaching!</strong><br>
              Grant: <strong>${data.grantTitle}</strong><br>
              Deadline: <strong>${new Date(data.deadline).toLocaleDateString()}</strong>
            </div>
            <p>This is a friendly reminder that the deadline for the above grant is approaching. Please ensure all required documentation and reports are submitted on time.</p>
            <a href="#" class="button">View Grant Details</a>
            <p>Best regards,<br>NonProfit Management System</p>
          </div>
        </div>
      `;

    case 'budget_alert':
      const alertClass = data.budgetPercentage >= 90 ? 'alert-danger' : 'alert-warning';
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>💰 Budget Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <div class="alert ${alertClass}">
              <strong>Budget Threshold Reached!</strong><br>
              Program: <strong>${data.programName}</strong><br>
              Budget Used: <strong>${data.budgetPercentage}%</strong>
            </div>
            <p>The program "${data.programName}" has reached ${data.budgetPercentage}% of its allocated budget. Please review expenses and adjust spending accordingly.</p>
            <a href="#" class="button">View Budget Details</a>
            <p>Best regards,<br>NonProfit Management System</p>
          </div>
        </div>
      `;

    case 'volunteer_reminder':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>🤝 Volunteer Hour Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <div class="alert alert-info">
              <strong>Time to Log Your Hours!</strong><br>
              Program: <strong>${data.programName}</strong><br>
              Hours Committed: <strong>${data.volunteerHours}</strong>
            </div>
            <p>We hope you're enjoying your volunteer experience! Please remember to log your volunteer hours for accurate tracking and reporting.</p>
            <a href="#" class="button">Log Volunteer Hours</a>
            <p>Thank you for your valuable contribution!<br>NonProfit Management System</p>
          </div>
        </div>
      `;

    case 'board_meeting':
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📋 Board Meeting Reminder</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <div class="alert alert-info">
              <strong>Upcoming Board Meeting</strong><br>
              Date: <strong>${new Date(data.meetingDate).toLocaleDateString()}</strong><br>
              Time: <strong>${new Date(data.meetingDate).toLocaleTimeString()}</strong>
            </div>
            <p>This is a reminder about the upcoming board meeting. Please review the agenda and prepare any necessary materials.</p>
            <a href="#" class="button">View Meeting Details</a>
            <p>Best regards,<br>NonProfit Management System</p>
          </div>
        </div>
      `;

    default:
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📢 Notification</h1>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>You have a new notification from the NonProfit Management System.</p>
            <p>Best regards,<br>NonProfit Management System</p>
          </div>
        </div>
      `;
  }
}