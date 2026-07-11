
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Use the correct import for sequence processing
import { sequenceProcessingService } from '@/services/email/sequences/sequenceProcessingService';

interface EmailSequenceProcessButtonProps {
  className?: string;
  sequenceId?: string;
}

export function EmailSequenceProcessButton({ className, sequenceId }: EmailSequenceProcessButtonProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const result = await sequenceProcessingService.triggerSequenceProcessing({ 
        sequenceId: sequenceId
      });
      
      if (result.data) {
        toast({
          title: "Processing triggered",
          description: sequenceId 
            ? "This email sequence is now being processed" 
            : "All email sequences are now being processed",
        });
      } else {
        toast({
          title: "Processing failed",
          description: "Could not trigger email sequence processing",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error triggering sequence processing:", error);
      toast({
        title: "Processing error",
        description: "An error occurred while processing sequences",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      variant="default" 
      size="sm" 
      className={className} 
      onClick={handleProcess}
      disabled={isProcessing}
    >
      <Play className="h-4 w-4 mr-2" />
      {sequenceId ? "Process This Sequence" : "Process All Sequences"}
    </Button>
  );
}
