import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, CloudUpload, Loader2 } from 'lucide-react';
import { useOfflineInspections } from '@/hooks/useOfflineInspections';

interface OfflineStatusBarProps {
  onSync?: () => Promise<void>;
}

export function OfflineStatusBar({ onSync }: OfflineStatusBarProps) {
  const { isOnline, pendingCount, syncing, setSyncing } = useOfflineInspections();

  const handleSync = async () => {
    if (!onSync || syncing || !isOnline) return;
    
    setSyncing(true);
    try {
      await onSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      <Badge 
        variant={isOnline ? 'outline' : 'destructive'} 
        className="flex items-center gap-1"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>

      {/* Pending count */}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          {pendingCount} pending
        </Badge>
      )}

      {/* Sync button */}
      {pendingCount > 0 && isOnline && onSync && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <CloudUpload className="h-3 w-3 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      )}
    </div>
  );
}
