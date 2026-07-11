
import React from 'react';
import { Check, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NotificationsDropdownHeaderProps {
  unreadCount: number;
  connectionStatus: boolean;
  notifications: any[];
  onMarkAllAsRead: (e: React.MouseEvent) => void;
  onClearAllNotifications: (e: React.MouseEvent) => void;
}

export function NotificationsDropdownHeader({
  unreadCount,
  connectionStatus,
  notifications,
  onMarkAllAsRead,
  onClearAllNotifications
}: NotificationsDropdownHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
      <div className="flex items-center">
        <h3 className="font-medium">Notifications</h3>
        <div className="ml-2 flex items-center">
          {connectionStatus ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs border-green-200 flex items-center gap-1 py-0 h-5">
              <Wifi className="h-3 w-3" />
              <span>Connected</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs border-amber-200 flex items-center gap-1 py-0 h-5">
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMarkAllAsRead}
            className="h-8 text-xs"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        )}
        {notifications.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearAllNotifications}
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
