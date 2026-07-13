
import React, { useState, useCallback, useMemo } from 'react';
import { Notification, NotificationPreferences } from '@/types/notification';
import { NotificationsContext } from './NotificationsContext';
import { defaultNotifications, defaultPreferences } from './defaultData';
import { toast } from '@/hooks/use-toast';
import { createUpdatePreferencesHandler, createUpdateSubscriptionHandler } from './preferenceHandlers';

interface NotificationsProviderProps {
  children: React.ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);
  const [unreadCount, setUnreadCount] = useState(() => 
    defaultNotifications.filter(n => !n.read).length
  );
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [connectionStatus, setConnectionStatus] = useState(true);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    if (notification.type !== 'info') {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
        duration: notification.duration || 5000,
      });
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const updatePreferences = createUpdatePreferencesHandler(setPreferences);
  const updateSubscription = createUpdateSubscriptionHandler(setPreferences);

  const triggerTestNotification = useCallback(() => {
    addNotification({
      title: 'Test Notification',
      message: 'This is a test notification to verify the system is working correctly.',
      type: 'info',
      category: 'system'
    });
  }, [addNotification]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    connectionStatus,
    preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    updatePreferences,
    updateSubscription,
    triggerTestNotification
  }), [
    notifications, 
    unreadCount, 
    connectionStatus,
    preferences,
    addNotification, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications,
    updatePreferences,
    updateSubscription,
    triggerTestNotification
  ]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
