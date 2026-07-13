import { useState, useEffect } from 'react';

interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Load notifications from localStorage
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem('app_notifications');
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationData[];
        setNotifications(parsed);
        setUnreadCount(parsed.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const saveNotifications = (newNotifications: NotificationData[]) => {
    try {
      localStorage.setItem('app_notifications', JSON.stringify(newNotifications));
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  };

  const showNotification = async (
    title: string,
    options: {
      body?: string;
      icon?: string;
      badge?: string;
      tag?: string;
      type?: NotificationData['type'];
    } = {}
  ) => {
    // Add to app notifications
    const notification: NotificationData = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      body: options.body || '',
      type: options.type || 'info',
      read: false,
      timestamp: Date.now()
    };

    const updated = [notification, ...notifications].slice(0, 100); // Keep only latest 100
    saveNotifications(updated);

    // Show browser notification if permission granted
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body: options.body,
          icon: options.icon || '/icon-192.png',
          badge: options.badge || '/icon-192.png',
          tag: options.tag,
          requireInteraction: false,
          data: { notificationId: notification.id }
        });
      } catch (error) {
        console.error('Failed to show browser notification:', error);
      }
    }

    return notification.id;
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const removeNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  return {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    showNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  };
}