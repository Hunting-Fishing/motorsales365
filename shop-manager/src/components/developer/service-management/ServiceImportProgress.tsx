
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ServiceImportProgressProps {
  isImporting: boolean;
  progress: number;
  stage: string;
  message: string;
  error: string | null;
  completed: boolean;
  operation: string;
  onCancel?: () => void;
}

export function ServiceImportProgress({
  isImporting,
  progress,
  stage,
  message,
  error,
  completed,
  operation,
  onCancel
}: ServiceImportProgressProps) {
  if (!isImporting && !completed && !error) {
    return null;
  }

  const getStatusIcon = () => {
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (completed) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (isImporting) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusColor = () => {
    if (error) return 'destructive';
    if (completed) return 'default';
    return 'default';
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="capitalize">{operation} Progress</span>
          </div>
          {isImporting && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="capitalize">{stage}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <Alert variant={getStatusColor()}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {completed && !error && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Success:</strong> {operation} completed successfully! The data should now be visible in all views.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
