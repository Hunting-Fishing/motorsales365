
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  componentName?: string;
}

function DashboardErrorFallback({ 
  error, 
  resetErrorBoundary, 
  componentName = 'Dashboard Component' 
}: DashboardErrorFallbackProps) {
  return (
    <Card className="w-full">
      <CardContent className="py-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Error in {componentName}</h3>
            <p className="text-sm text-gray-600 mt-2">
              Something went wrong while loading this component.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
          <Button onClick={resetErrorBoundary} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SafeDashboardWrapperProps {
  children: React.ReactNode;
  componentName?: string;
}

export function SafeDashboardWrapper({ 
  children, 
  componentName 
}: SafeDashboardWrapperProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => (
        <DashboardErrorFallback {...props} componentName={componentName} />
      )}
      onError={(error, errorInfo) => {
        console.error(`Error in ${componentName}:`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
