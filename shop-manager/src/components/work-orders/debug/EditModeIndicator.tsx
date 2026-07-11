
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { WorkOrder } from '@/types/workOrder';
import { StatusSelector } from '@/components/work-orders/shared/StatusSelector';

interface EditModeIndicatorProps {
  workOrder: WorkOrder | null;
  isEditMode: boolean;
  className?: string;
  onStatusChange?: (newStatus: string) => void;
}

export function EditModeIndicator({ 
  workOrder, 
  isEditMode, 
  className,
  onStatusChange 
}: EditModeIndicatorProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange && workOrder) {
      onStatusChange(newStatus);
    }
  };

  return (
    <div className={`text-xs space-y-1 ${className}`}>
      <Badge variant={isEditMode ? "default" : "secondary"}>
        {isEditMode ? "Edit Mode" : "Read Only"}
      </Badge>
      {workOrder && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Status:</span>
          {isEditMode && onStatusChange ? (
            <StatusSelector
              currentStatus={workOrder.status}
              type="workOrder"
              onStatusChange={handleStatusChange}
              disabled={false}
            />
          ) : (
            <span>{workOrder.status}</span>
          )}
        </div>
      )}
    </div>
  );
}
