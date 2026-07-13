
import { toast } from '@/hooks/use-toast';
import { ErrorType, ErrorSeverity, OnboardingError, ERROR_CODES, USER_FRIENDLY_MESSAGES } from './errorTypes';

export class ErrorHandler {
  private static logError(error: OnboardingError | Error, context?: Record<string, any>) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: context || {},
      ...(error instanceof OnboardingError && {
        type: error.type,
        severity: error.severity,
        code: error.code,
        userMessage: error.userMessage,
        details: error.details
      })
    };

    console.error('Error logged:', errorInfo);
    
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (Sentry, etc.)
    }
  }

  public static handleError(error: unknown, context?: Record<string, any>): OnboardingError {
    let processedError: OnboardingError;

    if (error instanceof OnboardingError) {
      processedError = error;
    } else if (error instanceof Error) {
      processedError = this.classifyError(error);
    } else {
      processedError = new OnboardingError(
        ErrorType.UNKNOWN,
        ErrorSeverity.ERROR,
        'UNKNOWN_ERROR',
        'An unknown error occurred',
        'Something went wrong. Please try again.',
        error
      );
    }

    this.logError(processedError, context);
    return processedError;
  }

  private static classifyError(error: Error): OnboardingError {
    const message = error.message.toLowerCase();

    // Database constraint violations
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return new OnboardingError(
        ErrorType.DATABASE,
        ErrorSeverity.WARNING,
        ERROR_CODES.DUPLICATE_ONBOARDING,
        error.message,
        USER_FRIENDLY_MESSAGES[ERROR_CODES.DUPLICATE_ONBOARDING],
        error
      );
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return new OnboardingError(
        ErrorType.NETWORK,
        ErrorSeverity.ERROR,
        ERROR_CODES.NETWORK_TIMEOUT,
        error.message,
        USER_FRIENDLY_MESSAGES[ERROR_CODES.NETWORK_TIMEOUT],
        error
      );
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('auth')) {
      return new OnboardingError(
        ErrorType.AUTHENTICATION,
        ErrorSeverity.CRITICAL,
        ERROR_CODES.UNAUTHORIZED,
        error.message,
        USER_FRIENDLY_MESSAGES[ERROR_CODES.UNAUTHORIZED],
        error
      );
    }

    // Default classification
    return new OnboardingError(
      ErrorType.UNKNOWN,
      ErrorSeverity.ERROR,
      'UNCLASSIFIED_ERROR',
      error.message,
      'An unexpected error occurred. Please try again.',
      error
    );
  }

  public static showUserError(error: OnboardingError, options?: { 
    showDetails?: boolean;
    duration?: number;
  }) {
    const { showDetails = false, duration = 5000 } = options || {};

    toast({
      title: error.severity === ErrorSeverity.CRITICAL ? "Critical Error" : "Error",
      description: showDetails ? `${error.userMessage}\n\nDetails: ${error.message}` : error.userMessage,
      variant: error.severity === ErrorSeverity.WARNING ? "default" : "destructive",
      duration
    });
  }

  public static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: OnboardingError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.handleError(error, { ...context, attempt });
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // Don't retry critical errors or validation errors
        if (lastError.severity === ErrorSeverity.CRITICAL || 
            lastError.type === ErrorType.VALIDATION) {
          throw lastError;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }
}
