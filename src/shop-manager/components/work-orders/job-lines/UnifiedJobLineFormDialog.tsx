
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorkOrderJobLine } from '@/types/jobLine';
import { ServiceBasedJobLineForm } from './ServiceBasedJobLineForm';

export interface UnifiedJobLineFormDialogProps {
  workOrderId: string;
  mode: 'add-service' | 'add-manual' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (jobLines: WorkOrderJobLine[]) => void;
  jobLine?: WorkOrderJobLine;
}

export function UnifiedJobLineFormDialog({
  workOrderId,
  mode,
  open,
  onOpenChange,
  onSave,
  jobLine
}: UnifiedJobLineFormDialogProps) {
  const getDialogTitle = () => {
    switch (mode) {
      case 'add-service':
        return 'Add Job Line from Service';
      case 'add-manual':
        return 'Add Manual Job Line';
      case 'edit':
        return 'Edit Job Line';
      default:
        return 'Job Line';
    }
  };

  const handleSave = (jobLines: WorkOrderJobLine[]) => {
    onSave(jobLines);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        <ServiceBasedJobLineForm
          workOrderId={workOrderId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
