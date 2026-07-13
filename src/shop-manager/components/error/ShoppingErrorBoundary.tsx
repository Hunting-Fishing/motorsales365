import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ShoppingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ShoppingErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

class ShoppingErrorBoundary extends Component<ShoppingErrorBoundaryProps, ShoppingErrorBoundaryState> {
  constructor(props: ShoppingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ShoppingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Shopping Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Track error in analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
        custom_map: { page: 'shopping' }
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ShoppingErrorFallback 
        error={this.state.error} 
        onRetry={this.handleRetry}
      />;
    }

    return this.props.children;
  }
}

interface ShoppingErrorFallbackProps {
  error?: Error;
  onRetry: () => void;
}

const ShoppingErrorFallback: React.FC<ShoppingErrorFallbackProps> = ({ error, onRetry }) => {
  const navigate = useNavigate();

  const isNetworkError = error?.message.includes('fetch') || error?.message.includes('network');
  const isDataError = error?.message.includes('database') || error?.message.includes('supabase');

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl">Shopping Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {isNetworkError 
                ? "There seems to be a network connectivity issue. Please check your internet connection and try again."
                : isDataError
                ? "We're having trouble loading shopping data. This might be a temporary issue with our servers."
                : "An unexpected error occurred while loading the shopping page. Our team has been notified."
              }
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === 'development' && error && (
            <Alert>
              <AlertTitle>Development Info</AlertTitle>
              <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                {error.toString()}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={onRetry} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>If the problem persists, please contact our support team.</p>
            <p className="mt-1">Error ID: {Date.now().toString(36)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShoppingErrorBoundary;