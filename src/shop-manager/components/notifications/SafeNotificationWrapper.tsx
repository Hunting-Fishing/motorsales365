
import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  isExtensionError: boolean;
}

/**
 * Enhanced safe wrapper for notification components with better extension conflict handling
 */
export class SafeNotificationWrapper extends Component<Props, State> {
  private mounted = false;
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      isExtensionError: false 
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
    console.error('🔔 SafeNotificationWrapper caught error:', error);
    
    // Detect extension-related errors
    const isExtensionError = error.message?.includes('chrome-extension') ||
                            error.message?.includes('querySelector') ||
                            error.message?.includes('Failed to execute') ||
                            error.stack?.includes('extension');
    
    return { 
      hasError: true, 
      error,
      isExtensionError 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!this.mounted) return;

    console.error(`🔔 Notification component error in ${this.props.componentName || 'unknown'}:`, error);
    console.error('Error info:', errorInfo);
    
    const isExtensionError = this.state.isExtensionError;
    
    if (isExtensionError) {
      console.warn('🔌 Extension-related notification error detected');
      // Auto-retry for extension errors
      this.scheduleRetry();
    }
    
    this.setState({ error, errorInfo, isExtensionError });
  }

  private scheduleRetry = () => {
    if (!this.mounted || this.state.retryCount >= 3) return;

    this.retryTimeout = setTimeout(() => {
      if (this.mounted) {
        console.log(`🔄 Retrying notification component (attempt ${this.state.retryCount + 1})`);
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1,
          isExtensionError: false
        }));
      }
    }, 1000 * Math.pow(2, this.state.retryCount)); // Exponential backoff
  };

  handleReset = () => {
    if (this.mounted) {
      this.setState({ 
        hasError: false, 
        error: undefined, 
        errorInfo: undefined,
        retryCount: 0,
        isExtensionError: false
      });
    }
  };

  render() {
    if (this.state.hasError) {
      const Icon = this.state.isExtensionError ? Shield : AlertTriangle;
      const iconColor = this.state.isExtensionError ? "text-amber-600" : "text-red-600";
      const bgColor = this.state.isExtensionError ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
      const message = this.state.isExtensionError 
        ? "Notification system is recovering from extension interference"
        : "Notification component temporarily unavailable";

      return (
        <div className={`flex items-center gap-2 p-2 text-sm rounded-md border ${bgColor}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-muted-foreground">{message}</span>
          <button 
            onClick={this.handleReset}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <Suspense 
        fallback={
          <div className="animate-pulse bg-gray-100 h-8 w-8 rounded" />
        }
      >
        <div data-notification-safe="true" style={{ isolation: 'isolate' }}>
          {this.props.children}
        </div>
      </Suspense>
    );
  }
}
