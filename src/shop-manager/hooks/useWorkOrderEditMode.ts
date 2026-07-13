
import { useState } from 'react';
import { WorkOrder } from '@/types/workOrder';

export function useWorkOrderEditMode(workOrder: WorkOrder | null | undefined) {
  const [forceEditMode, setForceEditMode] = useState(false);
  
  // Work order is editable if:
  // 1. It exists
  // 2. Status is not 'completed' OR edit mode is manually enabled
  const isEditMode = workOrder ? (workOrder.status !== 'completed' || forceEditMode) : false;
  
  const canEdit = workOrder !== null && workOrder !== undefined;
  const isCompleted = workOrder?.status === 'completed';
  
  return {
    isEditMode,
    isReadOnly: !isEditMode,
    canEdit,
    isCompleted,
    forceEditMode,
    setForceEditMode,
    statusMessage: isEditMode ? 'Editable' : 'Read Only - Completed'
  };
}
