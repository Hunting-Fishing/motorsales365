
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseSettingsErrorOptions {
  onError?: (error: Error) => void;
  showToast?: boolean;
}

export function useSettingsError(options: UseSettingsErrorOptions = {}) {
  const { onError, showToast = true } = options;
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown, context?: string) => {
    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
    
    setError(fullMessage);
    
    if (showToast) {
      toast({
        title: "Error",
        description: fullMessage,
        variant: "destructive",
      });
    }
    
    if (onError && err instanceof Error) {
      onError(err);
    }
    
    console.error('Settings error:', err);
  }, [onError, showToast, toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
}
