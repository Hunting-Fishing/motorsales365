
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/context/notifications';
import { NotificationsDropdown } from './NotificationsDropdown';
import { SafeComponentWrapper } from '../safety/SafeComponentWrapper';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  return (
    <SafeComponentWrapper 
      componentName="NotificationBell"
      enableDOMProtection={true}
      enableIsolation={true}
    >
      <NotificationBellContent />
    </SafeComponentWrapper>
  );
}

function NotificationBellContent() {
  const { unreadCount, connectionStatus } = useNotifications();

  return (
    <NotificationsDropdown>
      <Button variant="ghost" size="icon" className="relative">
        <Bell className={cn(
          "h-5 w-5", 
          connectionStatus ? "text-slate-500" : "text-slate-400"
        )} />
        
        {/* Connection status indicator */}
        <span 
          className={cn(
            "absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-white",
            connectionStatus ? "bg-green-500" : "bg-amber-500"
          )}
        />
        
        {/* Unread count indicator */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-2 w-2 rounded-full bg-red-500">
            {unreadCount > 9 && (
              <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        )}
      </Button>
    </NotificationsDropdown>
  );
}
