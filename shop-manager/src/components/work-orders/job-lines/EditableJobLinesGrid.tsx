
import React from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { WorkOrderLineItems } from './WorkOrderLineItems';
import { useWorkOrderJobLineOperations } from '@/hooks/useWorkOrderJobLineOperations';

interface EditableJobLinesGridProps {
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  onJobLinesChange: (jobLines: WorkOrderJobLine[]) => void;
  onPartsChange?: () => Promise<void>;
  onAddPart?: (partData: WorkOrderPartFormValues) => Promise<void>;
  onPartUpdate?: (partId: string, updates: Partial<WorkOrderPart>) => Promise<void>;
  onPartDelete?: (partId: string) => void;
  onPartReorder?: (partIds: string[]) => Promise<void>;
}

export function EditableJobLinesGrid({
  workOrderId,
  jobLines,
  allParts,
  onJobLinesChange,
  onPartsChange,
  onAddPart,
  onPartUpdate,
  onPartDelete,
  onPartReorder
}: EditableJobLinesGridProps) {
  // Enhanced job line operations for completion toggle
  const jobLineOperations = useWorkOrderJobLineOperations(
    jobLines, 
    onPartsChange || (async () => {})
  );

  return (
    <WorkOrderLineItems
      jobLines={jobLines}
      allParts={allParts}
      workOrderId={workOrderId}
      isEditMode={true}
      onJobLinesChange={onJobLinesChange}
      onPartsChange={onPartsChange}
      onJobLineToggleCompletion={jobLineOperations.handleToggleCompletion}
      onPartUpdate={onPartUpdate}
      onPartDelete={onPartDelete}
      onPartReorder={onPartReorder}
      onAddPart={onAddPart}
    />
  );
}
