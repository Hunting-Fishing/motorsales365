import { supabase } from "@/integrations/supabase/client";

export interface CustomerNotification {
  id: string;
  user_id: string;
  order_id?: string;
  type: 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'price_drop' | 'back_in_stock' | 'wishlist_update';
  title: string;
  message: string;
  read: boolean;
  email_sent: boolean;
  sms_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  order_updates: boolean;
  price_alerts: boolean;
  marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationRequest {
  user_id: string;
  order_id?: string;
  type: CustomerNotification['type'];
  title: string;
  message: string;
}

export const customerNotificationService = {
  // Get user notifications using existing notifications table
  async getUserNotifications(userId: string, limit = 50): Promise<CustomerNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      user_id: item.user_id,
      order_id: null,
      type: 'order_confirmed' as const,
      title: item.title,
      message: item.message,
      read: item.read,
      email_sent: false,
      sms_sent: false,
      created_at: item.timestamp,
      updated_at: item.timestamp
    })) || [];
  },

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  },

  // Create notification
  async createNotification(notification: CreateNotificationRequest): Promise<CustomerNotification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: 'info'
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      user_id: data.user_id,
      order_id: null,
      type: 'order_confirmed' as const,
      title: data.title,
      message: data.message,
      read: data.read,
      email_sent: false,
      sms_sent: false,
      created_at: data.timestamp,
      updated_at: data.timestamp
    };
  },

  // Get user notification preferences (placeholder)
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    return {
      id: '1',
      user_id: userId,
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      order_updates: true,
      price_alerts: true,
      marketing: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  // Update notification preferences (placeholder)
  async updateNotificationPreferences(
    userId: string, 
    preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<NotificationPreferences> {
    return {
      id: '1',
      user_id: userId,
      email_notifications: preferences.email_notifications ?? true,
      sms_notifications: preferences.sms_notifications ?? false,
      push_notifications: preferences.push_notifications ?? true,
      order_updates: preferences.order_updates ?? true,
      price_alerts: preferences.price_alerts ?? true,
      marketing: preferences.marketing ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  },

  // Subscribe to notifications
  subscribeToNotifications(userId: string, callback: (notification: CustomerNotification) => void) {
    return supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const mapped = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            order_id: null,
            type: 'order_confirmed' as const,
            title: payload.new.title,
            message: payload.new.message,
            read: payload.new.read,
            email_sent: false,
            sms_sent: false,
            created_at: payload.new.timestamp,
            updated_at: payload.new.timestamp
          };
          callback(mapped as CustomerNotification);
        }
      )
      .subscribe();
  }
};