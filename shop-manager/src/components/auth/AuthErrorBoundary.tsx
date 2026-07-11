
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { performAuthRecovery } from '@/utils/authCleanup';

interface AuthErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function AuthErrorFallback({ error, resetErrorBoundary }: AuthErrorFallbackProps) {
  const handleAuthRecovery = async () => {
    try {
      await performAuthRecovery();
    } catch (err) {
      console.error('Auth recovery failed:', err);
      resetErrorBoundary();
    }
  };

  const isAuthError = error.message.toLowerCase().includes('auth') || 
                     error.message.toLowerCase().includes('token') ||
                     error.message.toLowerCase().includes('session');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Authentication Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            {isAuthError 
              ? 'There was a problem with your authentication. Please try logging in again.'
              : 'An unexpected error occurred. Please try again.'
            }
          </p>
          
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Technical Details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all bg-gray-100 p-2 rounded">
              {error.message}
            </pre>
          </details>
          
          <div className="flex gap-2">
            {isAuthError ? (
              <Button 
                onClick={handleAuthRecovery}
                className="flex-1"
                variant="default"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Go to Login
              </Button>
            ) : (
              <Button 
                onClick={resetErrorBoundary}
                className="flex-1"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function AuthErrorBoundary({ children, onError }: AuthErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={AuthErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Auth Error Boundary caught error:', error, errorInfo);
        onError?.(error, errorInfo);
      }}
      onReset={() => {
        // Clear any problematic state
        localStorage.clear();
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
