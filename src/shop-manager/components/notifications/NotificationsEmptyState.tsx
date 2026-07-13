
import React from 'react';
import { BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationsEmptyStateProps {
  connectionStatus: boolean;
  hasNotifications: boolean;
  onTriggerTest: (e: React.MouseEvent) => void;
}

export function NotificationsEmptyState({
  connectionStatus,
  hasNotifications,
  onTriggerTest
}: NotificationsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <BellOff className="h-8 w-8 text-slate-300 mb-2" />
      <p className="text-sm font-medium text-slate-500">No notifications</p>
      <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
      {!connectionStatus && (
        <p className="text-xs text-amber-500 mt-3 max-w-xs">
          You are currently offline. Notifications will sync when connection is restored.
        </p>
      )}
      {!hasNotifications && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onTriggerTest}
        >
          Trigger test notification
        </Button>
      )}
    </div>
  );
}
