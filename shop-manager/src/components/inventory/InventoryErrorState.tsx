
import React from "react";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface InventoryErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export function InventoryErrorState({ error, onRetry }: InventoryErrorStateProps) {
  return (
    <div className="container mx-auto p-4">
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Inventory</AlertTitle>
        <AlertDescription className="mt-2">
          {error}
          {onRetry && (
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
