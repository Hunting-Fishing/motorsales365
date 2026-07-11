import React, { useState } from 'react';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, XCircle } from 'lucide-react';
import { deleteWorkOrderPart, updateWorkOrderPart } from '@/services/workOrder';
import { toast } from 'sonner';
import { EditPartDialog } from './EditPartDialog';

interface PartAssignmentControlsProps {
  part: WorkOrderPart;
  jobLines: WorkOrderJobLine[];
  onSave: (updatedPart: WorkOrderPart) => Promise<void>;
  onDelete: (partId: string) => Promise<void>;
}

export function PartAssignmentControls({
  part,
  jobLines,
  onSave,
  onDelete
}: PartAssignmentControlsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<WorkOrderPart | null>(part);

  const handleEditClick = () => {
    setSelectedPart(part);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async () => {
    try {
      await onDelete(part.id);
      toast.success('Part deleted successfully');
    } catch (error) {
      console.error('Error deleting part:', error);
      toast.error('Failed to delete part');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleEditClick}
        className="gap-1"
      >
        <Edit className="h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDeleteClick}
        className="text-red-600 hover:text-red-700 gap-1"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>

      <EditPartDialog
        part={selectedPart!}
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedPart(null);
        }}
        onSave={async (partId: string, updates: Partial<WorkOrderPart>) => {
          try {
            const updatedPart = await updateWorkOrderPart(partId, updates);
            await onSave(updatedPart);
            setEditDialogOpen(false);
            setSelectedPart(null);
          } catch (error) {
            console.error('Error updating part:', error);
            toast.error('Failed to update part');
          }
        }}
      />
    </div>
  );
}
