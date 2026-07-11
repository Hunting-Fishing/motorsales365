
import React, { useState } from 'react';
import { Bell, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/context/notifications';
import { NotificationItem } from './NotificationItem';
import { NotificationsEmptyState } from './NotificationsEmptyState';
import { NotificationsDropdownHeader } from './NotificationsDropdownHeader';

interface NotificationsDropdownProps {
  children: React.ReactNode;
}

export function NotificationsDropdown({ children }: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    triggerTestNotification
  } = useNotifications();

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  const handleTestNotification = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerTestNotification();
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-hidden">
        <NotificationsDropdownHeader
          unreadCount={unreadCount}
          connectionStatus={connectionStatus}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClearAllNotifications={handleClearAll}
        />
        
        <DropdownMenuSeparator />
        
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <NotificationsEmptyState 
              connectionStatus={connectionStatus}
              hasNotifications={notifications.length > 0}
              onTriggerTest={handleTestNotification}
            />
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onClear={clearNotification}
              />
            ))
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleTestNotification}>
          <Bell className="h-4 w-4 mr-2" />
          Send Test Notification
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
