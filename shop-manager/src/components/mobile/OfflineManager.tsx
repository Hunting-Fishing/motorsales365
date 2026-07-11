import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface OfflineManagerProps {
  className?: string;
}

export function OfflineManager({ className }: OfflineManagerProps) {
  const { isOffline } = usePWA();
  const { 
    pendingChanges, 
    syncStatus, 
    forcSync, 
    clearOfflineData 
  } = useOfflineStorage();
  
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShowOfflineAlert(true);
    } else {
      // Hide alert after 3 seconds when back online
      const timer = setTimeout(() => {
        setShowOfflineAlert(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  const handleSync = async () => {
    try {
      await forcSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  if (!showOfflineAlert && pendingChanges === 0) {
    return null;
  }

  return (
    <div className={cn("fixed top-16 left-4 right-4 z-50", className)}>
      {isOffline ? (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <div className="font-medium">You're offline</div>
              <div className="text-sm">Changes will sync when connection is restored</div>
            </div>
            {pendingChanges > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingChanges} pending
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {pendingChanges > 0 && (
            <Alert className="border-warning/50 bg-warning/10">
              <CloudOff className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Syncing offline changes</div>
                  <div className="text-sm">{pendingChanges} items pending sync</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {syncStatus}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={syncStatus === 'syncing'}
                  >
                    {syncStatus === 'syncing' ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      'Sync Now'
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {showOfflineAlert && pendingChanges === 0 && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <Wifi className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-600">Back online</div>
                <div className="text-sm">All changes synced successfully</div>
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}