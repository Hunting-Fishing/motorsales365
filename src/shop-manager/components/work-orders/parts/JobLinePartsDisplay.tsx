
import React from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface JobLinePartsDisplayProps {
  jobLineId: string;
  parts: WorkOrderPart[];
  onRemovePart?: (partId: string) => void;
}

export function JobLinePartsDisplay({ jobLineId, parts, onRemovePart }: JobLinePartsDisplayProps) {
  const jobLineParts = parts.filter(part => part.job_line_id === jobLineId);

  const handleRemovePart = (partId: string) => {
    if (onRemovePart) {
      onRemovePart(partId);
    }
  };

  if (jobLineParts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No parts assigned to this job line
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {jobLineParts.map((part) => (
        <Card key={part.id} className="p-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-sm">{part.name}</div>
              <div className="text-xs text-muted-foreground">
                Part #: {part.part_number} | Qty: {part.quantity}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">${part.total_price.toFixed(2)}</div>
              <Badge variant="outline" className="text-xs">
                {part.status}
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
