import { supabase } from '@/integrations/supabase/client';

interface FeatureRequestNotification {
  id: string;
  feature_request_id: string;
  notification_type: string;
  recipient_type: string;
  recipient_email: string | null;
  notification_data: any;
  sent: boolean;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  shop_id: string;
}

interface WebhookLog {
  id: string;
  shop_id: string;
  webhook_type: string;
  webhook_url: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export class FeatureRequestNotificationService {
  /**
   * Process pending notifications by sending them via edge function
   */
  static async processPendingNotifications() {
    try {
      const { data: notifications, error } = await supabase
        .from('feature_request_notifications')
        .select('*')
        .eq('sent', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Process each notification
      for (const notification of notifications || []) {
        try {
          const { error: functionError } = await supabase.functions.invoke(
            'send-feature-request-notification',
            {
              body: { notification_id: notification.id }
            }
          );

          if (functionError) {
            console.error('Error sending notification:', functionError);
            // Update notification with error
            await supabase
              .from('feature_request_notifications')
              .update({ 
                error_message: functionError.message 
              })
              .eq('id', notification.id);
          } else {
            // Mark as sent
            await supabase
              .from('feature_request_notifications')
              .update({ 
                sent: true, 
                sent_at: new Date().toISOString() 
              })
              .eq('id', notification.id);
          }
        } catch (error) {
          console.error('Error invoking notification function:', error);
        }
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
    }
  }

  /**
   * Create a new notification for a feature request
   */
  static async createNotification(params: {
    featureRequestId: string;
    notificationType: 'new_request' | 'status_change' | 'comment_added' | 'vote_milestone';
    recipientType: 'admin' | 'submitter' | 'voter';
    recipientEmail?: string;
    notificationData?: any;
    shopId: string;
  }) {
    const { data, error } = await supabase
      .from('feature_request_notifications')
      .insert({
        feature_request_id: params.featureRequestId,
        notification_type: params.notificationType,
        recipient_type: params.recipientType,
        recipient_email: params.recipientEmail,
        notification_data: params.notificationData || {},
        shop_id: params.shopId,
        sent: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get notification preferences for current user
   */
  static async getUserNotificationPreferences() {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    return data;
  }

  /**
   * Update notification preferences for current user
   */
  static async updateNotificationPreferences(preferences: {
    email_notifications?: boolean;
    slack_webhook_url?: string;
    discord_webhook_url?: string;
  }) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get notification history for admin dashboard
   */
  static async getNotificationHistory(limit = 50): Promise<FeatureRequestNotification[]> {
    const { data, error } = await supabase
      .from('feature_request_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }

    return (data || []) as FeatureRequestNotification[];
  }

  /**
   * Get webhook logs for monitoring
   */
  static async getWebhookLogs(limit = 100): Promise<WebhookLog[]> {
    const { data, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching webhook logs:', error);
      return [];
    }

    return (data || []) as WebhookLog[];
  }

  /**
   * Log a webhook delivery attempt
   */
  static async logWebhookDelivery(params: {
    shopId: string;
    webhookType: 'slack' | 'discord' | 'custom';
    webhookUrl: string;
    payload: any;
    responseStatus?: number;
    responseBody?: string;
    success: boolean;
    errorMessage?: string;
  }) {
    const { error } = await supabase
      .from('webhook_logs')
      .insert({
        shop_id: params.shopId,
        webhook_type: params.webhookType,
        webhook_url: params.webhookUrl,
        payload: params.payload,
        response_status: params.responseStatus,
        response_body: params.responseBody,
        success: params.success,
        error_message: params.errorMessage
      });

    if (error) {
      console.error('Error logging webhook:', error);
    }
  }

  /**
   * Test webhook by sending a test notification
   */
  static async testWebhook(webhookUrl: string, type: 'slack' | 'discord', shopId?: string) {
    try {
      const testPayload = type === 'slack' 
        ? {
            text: '🧪 Test notification from Feature Request system',
            attachments: [{
              color: 'good',
              text: 'If you see this message, your webhook is working correctly!'
            }]
          }
        : {
            embeds: [{
              title: '🧪 Test Notification',
              description: 'If you see this message, your webhook is working correctly!',
              color: 0x00ff00
            }]
          };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      // Log the test result if shopId provided
      if (shopId) {
        await this.logWebhookDelivery({
          shopId,
          webhookType: type,
          webhookUrl,
          payload: { test: true },
          responseStatus: response.status,
          success: response.ok,
          errorMessage: response.ok ? undefined : `HTTP ${response.status}`
        });
      }

      return response.ok;
    } catch (error) {
      console.error('Webhook test failed:', error);
      
      if (shopId) {
        await this.logWebhookDelivery({
          shopId,
          webhookType: type,
          webhookUrl,
          payload: { test: true },
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      return false;
    }
  }
}

// Auto-process notifications every 30 seconds when the service is imported
if (typeof window !== 'undefined') {
  setInterval(() => {
    FeatureRequestNotificationService.processPendingNotifications();
  }, 30000);
}
