
import React, { useState } from 'react';
import { WorkOrderJobLine, isValidJobLineStatus } from '@/types/jobLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { UnifiedJobLineEditDialog } from './UnifiedJobLineEditDialog';
import { jobLineStatusMap } from '@/types/jobLine';

interface EnhancedJobLineItemProps {
  jobLine: WorkOrderJobLine;
  onUpdate: (updatedJobLine: WorkOrderJobLine) => void;
  isEditMode?: boolean;
}

export function EnhancedJobLineItem({
  jobLine,
  onUpdate,
  isEditMode = false
}: EnhancedJobLineItemProps) {
  const [editingJobLine, setEditingJobLine] = useState<WorkOrderJobLine | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditClick = () => {
    setEditingJobLine(jobLine);
    setIsEditDialogOpen(true);
  };

  const handleSaveJobLine = async (updatedJobLine: WorkOrderJobLine) => {
    await onUpdate(updatedJobLine);
    setIsEditDialogOpen(false);
    setEditingJobLine(null);
  };

  const validStatus = isValidJobLineStatus(jobLine.status || 'pending') ? jobLine.status! : 'pending';
  const statusInfo = jobLineStatusMap[validStatus] || { 
    label: 'Pending', 
    classes: 'bg-yellow-100 text-yellow-800' 
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{jobLine.name}</CardTitle>
                <Badge className={`${statusInfo.classes} text-xs font-medium`}>
                  {statusInfo.label}
                </Badge>
              </div>
              {jobLine.description && (
                <p className="text-sm text-muted-foreground">
                  {jobLine.description}
                </p>
              )}
            </div>
            {isEditMode && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditClick}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Hours: </span>
              {jobLine.estimated_hours || 0}
            </div>
            <div>
              <span className="text-muted-foreground">Rate: </span>
              ${jobLine.labor_rate || 0}
            </div>
            <div>
              <span className="text-muted-foreground">Total: </span>
              ${jobLine.total_amount || 0}
            </div>
          </div>
          
          {jobLine.parts && jobLine.parts.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <h5 className="text-sm font-medium mb-2">Associated Parts:</h5>
              <div className="space-y-2">
                {jobLine.parts.map((part, index) => (
                  <div key={part.id || index} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{part.name}</span>
                      <span className="text-muted-foreground ml-2">
                        Qty: {part.quantity}
                      </span>
                    </div>
                    <span>${part.unit_price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <UnifiedJobLineEditDialog
        jobLine={editingJobLine}
        workOrderId={jobLine.work_order_id}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveJobLine}
      />
    </>
  );
}
