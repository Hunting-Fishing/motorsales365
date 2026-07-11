
import { Notification } from "@/types/notification";

export interface NotificationServiceEvents {
  onNotification: (notification: Notification) => void;
  onConnectionStatus: (connected: boolean) => void;
}

export interface INotificationService {
  connect(userId: string): void;
  disconnect(): void;
  onNotification(listener: (notification: Notification) => void): () => void;
  onConnectionStatus(listener: (connected: boolean) => void): () => void;
  triggerDemoNotification(type?: 'info' | 'success' | 'warning' | 'error'): void;
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  clearNotification(id: string): Promise<void>;
  clearAllNotifications(): Promise<void>;
}
