
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sequenceProcessingService } from '@/services/email/sequences/sequenceProcessingService';

interface ProcessEnrollmentStepButtonProps {
  enrollmentId: string;
  onSuccess?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ProcessEnrollmentStepButton({
  enrollmentId,
  onSuccess,
  variant = "outline",
  size = "sm",
  className
}: ProcessEnrollmentStepButtonProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessNextStep = async () => {
    if (!enrollmentId) return;
    
    setIsProcessing(true);
    try {
      const result = await sequenceProcessingService.processEnrollmentNextStep(enrollmentId);
      
      if (result.data?.success) {
        toast({
          title: "Step processed",
          description: "The next step in the sequence has been processed.",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Processing failed",
          description: result.data?.message || "Could not process the next step in the sequence.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error processing enrollment step:", error);
      toast({
        title: "Processing error",
        description: "An error occurred while processing the step",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className} 
      onClick={handleProcessNextStep}
      disabled={isProcessing}
    >
      <Play className="h-4 w-4 mr-2" />
      {isProcessing ? "Processing..." : "Process Next Step"}
    </Button>
  );
}
