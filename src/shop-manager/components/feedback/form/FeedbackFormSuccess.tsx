
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface FeedbackFormSuccessProps {
  onComplete?: () => void;
}

export const FeedbackFormSuccess: React.FC<FeedbackFormSuccessProps> = ({ onComplete }) => {
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="pt-6 flex flex-col items-center justify-center p-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-center">Thank You!</h2>
        <p className="text-center text-gray-600 mt-2">
          Your feedback has been submitted successfully. We appreciate your input.
        </p>
        
        {onComplete && (
          <Button 
            onClick={onComplete} 
            className="mt-6"
            variant="outline"
          >
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
