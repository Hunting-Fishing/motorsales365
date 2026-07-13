
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, Database } from 'lucide-react';

interface ImportProgressIndicatorProps {
  isImporting: boolean;
  currentStep: string;
  progress: number;
  error?: string | null;
  completed: boolean;
}

export function ImportProgressIndicator({ 
  isImporting, 
  currentStep, 
  progress, 
  error, 
  completed 
}: ImportProgressIndicatorProps) {
  if (!isImporting && !completed && !error) {
    return null;
  }

  const getStatusIcon = () => {
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (completed) return <CheckCircle className="h-5 w-5 text-green-500" />;
    return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
  };

  const getStatusColor = () => {
    if (error) return 'destructive';
    if (completed) return 'default';
    return 'default';
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Import Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert variant={getStatusColor()}>
            {getStatusIcon()}
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>Status:</strong> {currentStep}</div>
                {progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
                {error && (
                  <div className="text-red-600 text-sm mt-2">
                    <strong>Error:</strong> {error}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
