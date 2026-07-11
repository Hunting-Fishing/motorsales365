
import React from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { UnifiedJobLineFormDialog } from './UnifiedJobLineFormDialog';

interface JobLineEditDialogProps {
  jobLine: WorkOrderJobLine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (jobLine: WorkOrderJobLine) => Promise<void>;
}

export function JobLineEditDialog({
  jobLine,
  open,
  onOpenChange,
  onSave
}: JobLineEditDialogProps) {
  const handleSave = async (jobLines: WorkOrderJobLine[]) => {
    if (jobLines.length > 0) {
      await onSave(jobLines[0]);
    }
  };

  if (!jobLine) return null;

  return (
    <UnifiedJobLineFormDialog
      workOrderId={jobLine.work_order_id}
      jobLine={jobLine}
      mode="edit"
      open={open}
      onOpenChange={onOpenChange}
      onSave={handleSave}
    />
  );
}
