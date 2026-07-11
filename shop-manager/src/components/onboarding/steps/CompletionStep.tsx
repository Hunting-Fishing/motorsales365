
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle } from 'lucide-react';

interface CompletionStepProps {
  onComplete: () => void;
  isCompleting?: boolean;
  isCompleted?: boolean;
}

export function CompletionStep({ onComplete, isCompleting, isCompleted }: CompletionStepProps) {
  if (isCompleted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle>Setup Complete!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Your All Business 365 account has been successfully configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Complete Setup</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        {isCompleting ? (
          <div className="space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">Finalizing your setup...</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">
              You're all set! Click the button below to complete your All Business 365 setup.
            </p>
            <Button onClick={onComplete} size="lg">
              Complete Setup
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
