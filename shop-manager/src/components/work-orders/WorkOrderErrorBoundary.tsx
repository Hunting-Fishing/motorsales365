
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface WorkOrderErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function WorkOrderErrorFallback({ error, resetErrorBoundary }: WorkOrderErrorFallbackProps) {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/work-orders');
    resetErrorBoundary();
  };

  return (
    <div className="p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Work Order Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Something went wrong while loading the work order. Please try again or go back to the work orders list.
          </p>
          
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Technical Details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all bg-gray-100 p-2 rounded">
              {error.message}
            </pre>
          </details>
          
          <div className="flex gap-2">
            <Button 
              onClick={resetErrorBoundary}
              className="flex-1"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={handleGoBack}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Work Orders
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface WorkOrderErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export function WorkOrderErrorBoundary({ children, onError }: WorkOrderErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={WorkOrderErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Work Order Error Boundary caught error:', error, errorInfo);
        onError?.(error, errorInfo);
      }}
      onReset={() => {
        // Clear any problematic state
        console.log('Work Order Error Boundary reset');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
