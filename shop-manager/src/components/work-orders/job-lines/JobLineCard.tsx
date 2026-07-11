
import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Clock, DollarSign, TrendingUp, Package } from 'lucide-react';
import { UnifiedJobLineEditDialog } from './UnifiedJobLineEditDialog';
import { jobLineStatusMap } from '@/types/jobLine';

interface JobLineCardProps {
  jobLine: WorkOrderJobLine;
  onUpdate: (updatedJobLine: WorkOrderJobLine) => void;
  onDelete: (jobLineId: string) => void;
  isEditMode?: boolean;
}

export function JobLineCard({
  jobLine,
  onUpdate,
  onDelete,
  isEditMode = false
}: JobLineCardProps) {
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

  const handleDeleteClick = () => {
    if (confirm('Are you sure you want to delete this job line?')) {
      onDelete(jobLine.id);
    }
  };

  const getStatusInfo = (status: string) => {
    return jobLineStatusMap[status] || { 
      label: status || 'Pending', 
      classes: 'bg-gray-100 text-gray-800' 
    };
  };

  const statusInfo = getStatusInfo(jobLine.status || 'pending');

  return (
    <>
      <Card className="work-order-card hover:shadow-lg transition-all duration-300 group">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-lg font-heading gradient-text">{jobLine.name}</CardTitle>
                <Badge className={`status-badge ${statusInfo.classes}`}>
                  {statusInfo.label}
                </Badge>
              </div>
              {jobLine.description && (
                <p className="text-sm text-muted-foreground font-body">
                  {jobLine.description}
                </p>
              )}
            </div>
            {isEditMode && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditClick}
                  className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteClick}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Labor Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-info/10">
                <Clock className="w-4 h-4 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Hours</p>
                <p className="text-sm font-bold font-heading">{jobLine.estimated_hours || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-warning/10">
                <DollarSign className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Rate</p>
                <p className="text-sm font-bold font-heading">${jobLine.labor_rate || 0}/hr</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-success/10">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-body">Total</p>
                <p className="text-lg font-bold font-heading text-success">${jobLine.total_amount || 0}</p>
              </div>
            </div>
          </div>
          
          {/* Associated Parts Section */}
          {jobLine.parts && jobLine.parts.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Package className="w-4 h-4 text-purple-500" />
                </div>
                <h5 className="text-sm font-semibold font-heading">Associated Parts ({jobLine.parts.length})</h5>
              </div>
              <div className="space-y-2">
                {jobLine.parts.map((part) => (
                  <div key={part.id} className="flex justify-between items-center p-2 rounded-lg bg-gradient-subtle border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div>
                        <p className="text-sm font-medium font-body">{part.name}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          Qty: {part.quantity} × ${part.unit_price}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-bold font-heading text-success">
                      ${((part.quantity || 0) * (part.unit_price || 0)).toFixed(2)}
                    </p>
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
