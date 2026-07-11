
import { Notification } from '@/types/notification';
import { INotificationService } from './types';
import { supabase } from '@/lib/supabase';

export class SupabaseNotificationService implements INotificationService {
  private userId: string | null = null;
  private listeners: {
    onNotification: ((notification: Notification) => void)[];
    onConnectionStatus: ((connected: boolean) => void)[];
  } = {
    onNotification: [],
    onConnectionStatus: []
  };
  private channel: any = null;
  private connected = false;

  connect(userId: string): void {
    this.userId = userId;
    this.setupRealtimeConnection();
  }

  disconnect(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.userId = null;
    this.connected = false;
    this.notifyConnectionStatus(false);
  }

  onNotification(listener: (notification: Notification) => void): () => void {
    this.listeners.onNotification.push(listener);
    return () => {
      const index = this.listeners.onNotification.indexOf(listener);
      if (index > -1) {
        this.listeners.onNotification.splice(index, 1);
      }
    };
  }

  onConnectionStatus(listener: (connected: boolean) => void): () => void {
    this.listeners.onConnectionStatus.push(listener);
    return () => {
      const index = this.listeners.onConnectionStatus.indexOf(listener);
      if (index > -1) {
        this.listeners.onConnectionStatus.splice(index, 1);
      }
    };
  }

  private setupRealtimeConnection(): void {
    if (!this.userId) return;

    this.channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${this.userId}`
      }, (payload) => {
        this.handleNotificationInsert(payload.new);
      })
      .subscribe((status) => {
        const isConnected = status === 'SUBSCRIBED';
        this.connected = isConnected;
        this.notifyConnectionStatus(isConnected);
      });
  }

  private handleNotificationInsert(data: any): void {
    const notification: Notification = {
      id: data.id,
      title: data.title,
      message: data.message,
      type: data.type,
      category: data.category,
      timestamp: data.created_at,
      read: data.read || false,
      duration: data.duration,
      actionUrl: data.action_url,
      link: data.link,
      priority: data.priority,
      sender: data.sender,
      recipient: data.recipient
    };

    this.listeners.onNotification.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.listeners.onConnectionStatus.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  triggerDemoNotification(type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const demoNotification: Notification = {
      id: `demo-${Date.now()}`,
      title: 'Demo Notification',
      message: `This is a ${type} demo notification to test the system.`,
      type,
      category: 'system',
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'medium'
    };

    this.listeners.onNotification.forEach(listener => {
      try {
        listener(demoNotification);
      } catch (error) {
        console.error('Error in demo notification listener:', error);
      }
    });
  }

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          message: notification.message,
          type: notification.type,
          user_id: this.userId,
          read: false,
          created_at: new Date().toISOString()
        } as any);

      if (error) {
        console.error('Error adding notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to add notification:', error);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    if (!this.userId) return;

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', this.userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async clearNotification(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error clearing notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to clear notification:', error);
      throw error;
    }
  }

  async clearAllNotifications(): Promise<void> {
    if (!this.userId) return;

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .delete()
        .eq('recipient_id', this.userId);

      if (error) {
        console.error('Error clearing all notifications:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      throw error;
    }
  }

  private getDemoCategories(): Array<'system' | 'work-order' | 'inventory' | 'customer' | 'team' | 'chat' | 'invoice'> {
    return ['system', 'inventory', 'customer', 'team', 'chat', 'invoice', 'work-order'];
  }

  private getRandomCategory(): 'system' | 'work-order' | 'inventory' | 'customer' | 'team' | 'chat' | 'invoice' {
    const categories = this.getDemoCategories();
    return categories[Math.floor(Math.random() * categories.length)];
  }
}

export const supabaseNotificationService = new SupabaseNotificationService();
