import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRetry(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRetry(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  if (isOnline && !showRetry) {
    return null;
  }

  return (
    <Alert variant={isOnline ? "default" : "destructive"} className="mb-4">
      {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isOnline 
            ? "Connection restored" 
            : "You're offline. Some features may not work properly."
          }
        </span>
        {showRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="ml-4"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default OfflineIndicator;