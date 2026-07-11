import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { UltimateAddPartDialog } from './UltimateAddPartDialog';
import { toast } from 'sonner';

interface AddPartButtonProps {
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  onPartAdded: () => Promise<void>;
  isEditMode: boolean;
  disabled?: boolean;
}

export function AddPartButton({
  workOrderId,
  jobLines,
  onPartAdded,
  isEditMode,
  disabled = false
}: AddPartButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  console.log('AddPartButton render:', { workOrderId, isEditMode, disabled });

  const handleOpenDialog = () => {
    console.log('Opening add part dialog');
    setIsDialogOpen(true);
  };

  const handlePartAdded = async () => {
    try {
      setIsProcessing(true);
      console.log('Part added, refreshing data...');
      
      await onPartAdded();
      setIsDialogOpen(false);
      
      toast.success('Part added successfully');
      console.log('Part addition completed successfully');
    } catch (error) {
      console.error('Error after adding part:', error);
      toast.error('Failed to refresh parts data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!isProcessing) {
      setIsDialogOpen(open);
    }
  };

  // Show button if in edit mode or if we want to allow viewing (with different styling)
  const canAddParts = isEditMode && !disabled;
  const buttonVariant = canAddParts ? "default" : "outline";
  const buttonText = canAddParts ? "Add Part" : "View Only";

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        size="sm"
        variant={buttonVariant}
        disabled={disabled || isProcessing}
        className="gap-2"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {isProcessing ? 'Processing...' : buttonText}
      </Button>

      <UltimateAddPartDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        workOrderId={workOrderId}
        jobLines={jobLines}
        onPartAdded={handlePartAdded}
      />
    </>
  );
}
