
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServiceErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  message?: string;
}

function ServiceErrorFallback({ error, resetErrorBoundary, message }: ServiceErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          Service Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {message || 'Something went wrong while loading the data. Please try again.'}
        </p>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 whitespace-pre-wrap break-all">
            {error.message}
          </pre>
        </details>
        <Button 
          onClick={resetErrorBoundary}
          className="w-full"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

interface ServiceErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function ServiceErrorBoundary({ 
  children, 
  fallbackMessage,
  onError 
}: ServiceErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <ServiceErrorFallback {...props} message={fallbackMessage} />
      )}
      onError={onError}
      onReset={() => window.location.reload()}
    >
      {children}
    </ErrorBoundary>
  );
}
