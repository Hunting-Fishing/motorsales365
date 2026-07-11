
import React from 'react';
import { NotificationsProvider as NewNotificationsProvider } from './notifications';
import { useNotifications as useNotificationsHook } from './notifications';

// Re-export the hook for backward compatibility
export const useNotifications = () => {
  return useNotificationsHook();
};

// This context is no longer used directly - only kept for compatibility
export const NotificationsContext = React.createContext<any>(null);

// No longer wrapping with provider here since we're using the provider in main.tsx
export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  return children;
};
