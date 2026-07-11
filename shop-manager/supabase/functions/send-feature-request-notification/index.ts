import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  notification_id: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id }: NotificationPayload = await req.json();

    // Get notification details
    const { data: notification, error: notificationError } = await supabase
      .from('feature_request_notifications')
      .select(`
        *,
        feature_requests (
          id,
          title,
          description,
          category,
          priority,
          status,
          submitter_name,
          submitter_email
        )
      `)
      .eq('id', notification_id)
      .single();

    if (notificationError || !notification) {
      throw new Error('Notification not found');
    }

    const featureRequest = notification.feature_requests;
    let emailSent = false;
    let webhooksSent = 0;

    // Send email notifications based on type
    if (notification.notification_type === 'new_request' && notification.recipient_type === 'admin') {
      // Get admin notification preferences
      const { data: adminPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('email_notifications', true);

      if (adminPrefs && adminPrefs.length > 0) {
        // Get admin users
        const { data: adminUsers } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            profiles (email, full_name)
          `)
          .in('role_id', ['admin', 'owner']);

        const adminEmails = adminUsers
          ?.map(u => u.profiles?.email)
          .filter(Boolean) || [];

        if (adminEmails.length > 0 && resend) {
          await resend.emails.send({
            from: 'Feature Requests <noreply@yourdomain.com>',
            to: adminEmails,
            subject: `New Feature Request: ${featureRequest.title}`,
            html: `
              <h2>New Feature Request Submitted</h2>
              <p><strong>Title:</strong> ${featureRequest.title}</p>
              <p><strong>Category:</strong> ${featureRequest.category}</p>
              <p><strong>Priority:</strong> ${featureRequest.priority}</p>
              <p><strong>Submitted by:</strong> ${featureRequest.submitter_name}</p>
              <p><strong>Description:</strong></p>
              <p>${featureRequest.description}</p>
              <p><a href="${Deno.env.get('SITE_URL')}/admin/feature-requests/${featureRequest.id}">View Request</a></p>
            `,
          });
          emailSent = true;
        }
      }

      // Send webhook notifications
      const { data: webhookPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .or('slack_webhook_url.neq.null,discord_webhook_url.neq.null');

      for (const pref of webhookPrefs || []) {
        if (pref.slack_webhook_url) {
          try {
            const response = await fetch(pref.slack_webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `🆕 New Feature Request: *${featureRequest.title}*`,
                attachments: [{
                  color: featureRequest.priority === 'high' ? 'danger' : 
                         featureRequest.priority === 'medium' ? 'warning' : 'good',
                  fields: [
                    { title: 'Category', value: featureRequest.category, short: true },
                    { title: 'Priority', value: featureRequest.priority, short: true },
                    { title: 'Submitted by', value: featureRequest.submitter_name, short: true }
                  ]
                }]
              })
            });

            await supabase.from('webhook_logs').insert({
              webhook_type: 'slack',
              webhook_url: pref.slack_webhook_url,
              payload: { notification_id, feature_request_id: featureRequest.id },
              response_status: response.status,
              success: response.ok
            });

            if (response.ok) webhooksSent++;
          } catch (error) {
            console.error('Slack webhook error:', error);
          }
        }

        if (pref.discord_webhook_url) {
          try {
            const response = await fetch(pref.discord_webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                embeds: [{
                  title: `🆕 New Feature Request: ${featureRequest.title}`,
                  description: featureRequest.description.substring(0, 200) + '...',
                  color: featureRequest.priority === 'high' ? 0xff0000 : 
                         featureRequest.priority === 'medium' ? 0xff8800 : 0x00ff00,
                  fields: [
                    { name: 'Category', value: featureRequest.category, inline: true },
                    { name: 'Priority', value: featureRequest.priority, inline: true },
                    { name: 'Submitted by', value: featureRequest.submitter_name, inline: true }
                  ]
                }]
              })
            });

            await supabase.from('webhook_logs').insert({
              webhook_type: 'discord',
              webhook_url: pref.discord_webhook_url,
              payload: { notification_id, feature_request_id: featureRequest.id },
              response_status: response.status,
              success: response.ok
            });

            if (response.ok) webhooksSent++;
          } catch (error) {
            console.error('Discord webhook error:', error);
          }
        }
      }
    }

    // Handle status change notifications to submitters
    if (notification.notification_type === 'status_change' && notification.recipient_type === 'submitter') {
      const submitterEmail = notification.notification_data.submitter_email;
      if (submitterEmail && resend) {
        await resend.emails.send({
          from: 'Feature Requests <noreply@yourdomain.com>',
          to: [submitterEmail],
          subject: `Feature Request Update: ${featureRequest.title}`,
          html: `
            <h2>Your Feature Request Has Been Updated</h2>
            <p><strong>Title:</strong> ${featureRequest.title}</p>
            <p><strong>Status:</strong> ${notification.notification_data.old_status} → ${notification.notification_data.new_status}</p>
            <p>Thank you for your feedback! We'll keep you updated on any further changes.</p>
          `,
        });
        emailSent = true;
      }
    }

    // Mark notification as sent
    await supabase
      .from('feature_request_notifications')
      .update({ 
        sent: true, 
        sent_at: new Date().toISOString() 
      })
      .eq('id', notification_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_sent: emailSent,
        webhooks_sent: webhooksSent
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);