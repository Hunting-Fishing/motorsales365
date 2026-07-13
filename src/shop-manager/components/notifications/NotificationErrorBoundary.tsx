
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class NotificationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Notification Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Log notification-specific errors for debugging
    if (error.message.includes('notification') || error.message.includes('sound')) {
      console.error('Notification system error detected:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
    
    this.setState({ error });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground bg-destructive/10 rounded-md">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span>Notification temporarily unavailable</span>
          <button 
            onClick={this.handleReset}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
