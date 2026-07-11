
import React from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { JobLineWithParts } from './JobLineWithParts';

interface UnifiedItemsTableProps {
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  workOrderId?: string;
  onPartUpdate?: (updatedPart: WorkOrderPart) => Promise<void>;
  onPartDelete?: (partId: string) => Promise<void>;
  onPartsChange?: () => void;
  isEditMode?: boolean;
  // Additional props that other components are passing
  onJobLineUpdate?: (updatedJobLine: WorkOrderJobLine) => Promise<void>;
  onJobLineDelete?: (jobLineId: string) => Promise<void>;
  onReorderJobLines?: (reorderedJobLines: WorkOrderJobLine[]) => Promise<void>;
  showType?: "all" | "joblines" | "parts" | "overview" | "unassigned";
  partsFilter?: "all" | "unassigned";
}

export function UnifiedItemsTable({
  jobLines,
  allParts,
  workOrderId = '',
  onPartUpdate,
  onPartDelete,
  onPartsChange,
  isEditMode = false,
  onJobLineUpdate,
  onJobLineDelete,
  onReorderJobLines,
  showType = "all",
  partsFilter = "all"
}: UnifiedItemsTableProps) {
  // Group parts by job line ID
  const getJobLineParts = (jobLineId: string) => {
    return allParts.filter(part => part.job_line_id === jobLineId);
  };

  const handlePartAdded = () => {
    console.log('Part added, refreshing parts...');
    if (onPartsChange) {
      onPartsChange();
    }
  };

  return (
    <div className="space-y-6">
      {jobLines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No job lines found for this work order.
        </div>
      ) : (
        jobLines.map((jobLine) => {
          const jobLineParts = getJobLineParts(jobLine.id);
          
          return (
            <JobLineWithParts
              key={jobLine.id}
              jobLine={jobLine}
              parts={jobLineParts}
              workOrderId={workOrderId}
              onPartAdded={handlePartAdded}
              isEditMode={isEditMode}
            />
          );
        })
      )}
    </div>
  );
}
