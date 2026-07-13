
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  isolateOnError?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isRetrying: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout;
  private mounted = true;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      isRetrying: false 
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('🚨 Enhanced Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!this.mounted) return;

    console.error('🔍 Enhanced Error Boundary detailed error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Check if this is an extension-related error
    const isExtensionError = this.isExtensionRelatedError(error);
    
    if (isExtensionError) {
      console.warn('🔌 Extension-related error detected:', error.message);
    }

    this.setState({
      error,
      errorInfo,
      hasError: true
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error) && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  private isExtensionRelatedError(error: Error): boolean {
    const extensionIndicators = [
      'chrome-extension',
      'moz-extension',
      'querySelector',
      'insertBefore',
      'removeChild',
      'appendChild',
      'Failed to execute'
    ];

    return extensionIndicators.some(indicator => 
      error.message?.includes(indicator) || error.stack?.includes(indicator)
    );
  }

  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for DOM manipulation errors (likely extension conflicts)
    const retryableErrors = [
      'querySelector',
      'insertBefore',
      'removeChild',
      'appendChild',
      'Failed to execute'
    ];

    return retryableErrors.some(pattern => error.message?.includes(pattern));
  }

  private scheduleRetry = () => {
    if (!this.mounted) return;

    this.setState({ isRetrying: true });
    
    this.retryTimeout = setTimeout(() => {
      if (this.mounted) {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1,
          isRetrying: false
        }));
      }
    }, 1000 * Math.pow(2, this.state.retryCount)); // Exponential backoff
  };

  handleManualRetry = () => {
    if (!this.mounted) return;

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRetrying: false
    });
  };

  handleReset = () => {
    if (!this.mounted) return;

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRetrying: false
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isRetrying) {
        return (
          <div className="flex items-center justify-center p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Recovering from error...</span>
            </div>
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isExtensionError = this.isExtensionRelatedError(this.state.error!);

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${isExtensionError ? 'bg-amber-100' : 'bg-red-100'}`}>
                {isExtensionError ? (
                  <Shield className="h-8 w-8 text-amber-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-xl">
              {isExtensionError ? 'Extension Conflict Detected' : 'Something went wrong'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {isExtensionError 
                ? "A browser extension is interfering with the app. The component will try to recover automatically."
                : "We encountered an unexpected error. Please try refreshing the component."
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-left">
                <p className="text-sm font-mono text-red-800 mb-2">
                  {this.state.error.message}
                </p>
                <details className="text-xs text-red-700">
                  <summary className="cursor-pointer">Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs">
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}

            <div className="space-y-2">
              <Button onClick={this.handleManualRetry} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              {this.state.retryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Retry attempt: {this.state.retryCount}/{this.props.maxRetries || 3}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Isolate children in a protective wrapper if requested
    if (this.props.isolateOnError) {
      return (
        <div style={{ isolation: 'isolate' }} className="contents">
          {this.props.children}
        </div>
      );
    }

    return this.props.children;
  }
}
