
import { Notification, NotificationPreferences } from '@/types/notification';

export interface NotificationsContextProps {
  notifications: Notification[];
  unreadCount: number;
  connectionStatus: boolean;
  preferences: NotificationPreferences;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  updateSubscription: (category: keyof NotificationPreferences['categories'], enabled: boolean) => void;
  triggerTestNotification: () => void;
}
