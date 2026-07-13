
import React, { useState } from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PartsAssignmentService } from '@/services/workOrder/partsAssignmentService';

export interface PartsAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  parts: WorkOrderPart[];
  jobLines: WorkOrderJobLine[];
  onPartsAssigned: (assignedParts: WorkOrderPart[]) => void;
}

export function PartsAssignmentDialog({
  open,
  onClose,
  parts,
  jobLines,
  onPartsAssigned
}: PartsAssignmentDialogProps) {
  const [selectedJobLineId, setSelectedJobLineId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    if (!selectedJobLineId) {
      toast({
        title: "Error",
        description: "Please select a job line",
        variant: "destructive"
      });
      return;
    }

    setIsAssigning(true);
    try {
      const assignmentPromises = parts.map(part => 
        PartsAssignmentService.assignPartToJobLine({
          partId: part.id,
          jobLineId: selectedJobLineId,
          quantity: part.quantity,
          assignedBy: 'current-user', // This should come from auth context
          assignmentDate: new Date().toISOString(),
          notes: `Bulk assigned to job line`
        })
      );

      const results = await Promise.all(assignmentPromises);
      const successCount = results.filter(result => result).length;
      
      if (successCount === parts.length) {
        const jobLine = jobLines.find(jl => jl.id === selectedJobLineId);
        toast({
          title: "Parts Assigned",
          description: `${parts.length} part(s) assigned to ${jobLine?.name || 'job line'}`,
        });
        
        // Update parts with job line assignment
        const updatedParts = parts.map(part => ({
          ...part,
          job_line_id: selectedJobLineId
        }));
        
        onPartsAssigned(updatedParts);
        onClose();
      } else {
        toast({
          title: "Partial Success",
          description: `${successCount} of ${parts.length} parts were assigned successfully`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error assigning parts:', error);
      toast({
        title: "Error",
        description: "Failed to assign parts",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedJobLineId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assign Parts to Job Line
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Parts List */}
          <div>
            <h4 className="text-sm font-medium mb-2">Parts to assign:</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {parts.map((part) => (
                <Card key={part.id} className="p-2">
                  <CardContent className="p-0">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{part.name}</span>
                      <span className="text-muted-foreground">#{part.part_number}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Job Line Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Job Line:</label>
            <Select value={selectedJobLineId} onValueChange={setSelectedJobLineId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a job line..." />
              </SelectTrigger>
              <SelectContent>
                {jobLines.map((jobLine) => (
                  <SelectItem key={jobLine.id} value={jobLine.id}>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      {jobLine.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isAssigning}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isAssigning || !selectedJobLineId}
              className="flex-1"
            >
              {isAssigning ? "Assigning..." : "Assign Parts"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
