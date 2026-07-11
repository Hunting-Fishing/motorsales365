import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  status: 'loading' | 'success' | 'error' | 'idle';
  message?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressIndicator({
  progress,
  status,
  message,
  showPercentage = true,
  size = 'md',
}: ProgressIndicatorProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'loading':
        return 'bg-blue-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="w-full space-y-2">
      {(message || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {message && (
              <span className="text-muted-foreground">{message}</span>
            )}
          </div>
          {showPercentage && (
            <span className="text-muted-foreground font-medium">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      
      <div className="relative">
        <Progress 
          value={progress} 
          className={`${sizeClasses[size]} transition-all duration-300`}
        />
        {status === 'loading' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        )}
      </div>
    </div>
  );
}

interface BulkOperationProgressProps {
  operation: string;
  completed: number;
  total: number;
  currentItem?: string;
  errors?: number;
}

export function BulkOperationProgress({
  operation,
  completed,
  total,
  currentItem,
  errors = 0,
}: BulkOperationProgressProps) {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const hasErrors = errors > 0;
  const isComplete = completed === total;
  
  const status = isComplete 
    ? (hasErrors ? 'error' : 'success')
    : 'loading';

  return (
    <div className="p-4 bg-card rounded-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{operation}</h3>
        <span className="text-sm text-muted-foreground">
          {completed} of {total}
        </span>
      </div>
      
      <ProgressIndicator
        progress={progress}
        status={status}
        message={currentItem ? `Processing: ${currentItem}` : undefined}
        showPercentage={true}
        size="md"
      />
      
      {hasErrors && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{errors} error{errors !== 1 ? 's' : ''} occurred</span>
        </div>
      )}
      
      {isComplete && !hasErrors && (
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Operation completed successfully</span>
        </div>
      )}
    </div>
  );
}