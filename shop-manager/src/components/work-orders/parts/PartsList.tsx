
import React from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { partStatusMap } from '@/types/workOrderPart';

interface PartsListProps {
  parts: WorkOrderPart[];
  jobLines: WorkOrderJobLine[];
  onPartUpdate?: (partId: string, updates: Partial<WorkOrderPart>) => Promise<void>;
  onPartDelete?: (partId: string) => Promise<void>;
  isEditMode?: boolean;
}

export function PartsList({
  parts,
  jobLines,
  onPartUpdate,
  onPartDelete,
  isEditMode = false
}: PartsListProps) {
  const getJobLineName = (jobLineId?: string) => {
    if (!jobLineId) return 'Unassigned';
    const jobLine = jobLines.find(jl => jl.id === jobLineId);
    return jobLine?.name || 'Unknown Job Line';
  };

  const getStatusInfo = (status?: string) => {
    return partStatusMap[status || 'pending'] || partStatusMap['pending'];
  };

  if (parts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No parts added yet</p>
        <p className="text-sm">Click "Add Part" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parts.map((part) => {
        const statusInfo = getStatusInfo(part.status);
        
        return (
          <div key={part.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{part.name}</h4>
                  <Badge className={statusInfo.classes}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Part #: {part.part_number}
                </p>
                {part.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {part.description}
                  </p>
                )}
              </div>
              {isEditMode && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {onPartDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPartDelete(part.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Quantity:</span> {part.quantity}
              </div>
              <div>
                <span className="font-medium">Unit Price:</span> ${part.unit_price.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Total:</span> ${part.total_price.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Job Line:</span> {getJobLineName(part.job_line_id)}
              </div>
            </div>

            {part.notes && (
              <div className="text-sm">
                <span className="font-medium">Notes:</span> {part.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
