
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface PartsErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface PartsErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}

export class PartsErrorBoundary extends React.Component<
  PartsErrorBoundaryProps,
  PartsErrorBoundaryState
> {
  constructor(props: PartsErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): PartsErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PartsErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to external service if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} resetError={this.handleReset} />;
      }

      return (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Parts System Error</AlertTitle>
              <AlertDescription className="space-y-4">
                <div>
                  Something went wrong with the parts management system. 
                  This error has been logged and will be investigated.
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-medium">
                      Error Details (Development Mode)
                    </summary>
                    <div className="mt-2 p-4 bg-red-50 rounded border text-sm font-mono">
                      <div className="font-bold text-red-800">
                        {this.state.error.name}: {this.state.error.message}
                      </div>
                      <pre className="mt-2 whitespace-pre-wrap text-red-700">
                        {this.state.error.stack}
                      </pre>
                      {this.state.errorInfo && (
                        <pre className="mt-2 whitespace-pre-wrap text-red-600">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}

                <div className="flex space-x-2 pt-2">
                  <Button 
                    onClick={this.handleReset}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                  >
                    Reload Page
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withPartsErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <PartsErrorBoundary>
        <Component {...props} />
      </PartsErrorBoundary>
    );
  };
}
