
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sequenceProcessingService } from '@/services/email/sequences/sequenceProcessingService';

export function ManageSequenceProcessingButton() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown');

  const handleProcessAll = async () => {
    setIsProcessing(true);
    try {
      const result = await sequenceProcessingService.triggerSequenceProcessing({
        force: true
      });
      
      if (result.data) {
        toast({
          title: "Processing triggered",
          description: `Processing has been triggered for all active sequences.`,
        });
      } else {
        toast({
          title: "Processing failed",
          description: "No active sequences found or processing could not be triggered.",
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

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const result = await sequenceProcessingService.checkProcessingHealth();
      
      if (result.data?.healthy) {
        setHealthStatus('healthy');
        toast({
          title: "System is healthy",
          description: "Email sequence processing system is operational.",
        });
      } else {
        setHealthStatus('unhealthy');
        toast({
          title: "System health check failed",
          description: result.data?.error || "Email sequence processing may not be working correctly.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking system health:", error);
      setHealthStatus('unhealthy');
      toast({
        title: "Health check error",
        description: "Could not check email sequence system health",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Manage Sequences
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Email Sequence Processing</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleProcessAll}
          disabled={isProcessing}
        >
          <Play className="mr-2 h-4 w-4" />
          {isProcessing ? "Processing..." : "Process All Sequences"}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={checkHealth}
          disabled={isChecking}
        >
          {isChecking ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : healthStatus === 'healthy' ? (
            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
          ) : healthStatus === 'unhealthy' ? (
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Check System Health
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
