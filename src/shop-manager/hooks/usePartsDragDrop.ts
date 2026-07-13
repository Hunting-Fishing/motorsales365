
import { useCallback } from 'react';
import { WorkOrderPart } from '@/types/workOrderPart';
import { EditService } from '@/services/workOrder/editService';
import { toast } from '@/hooks/use-toast';

export function usePartsDragDrop(
  parts: WorkOrderPart[],
  onPartsChange: (parts: WorkOrderPart[]) => void
) {
  const handleDragEnd = useCallback(async (event: any) => {
    const { active, over } = event;
    
    if (!over) return;

    const draggedPartId = active.id;
    const targetJobLineId = over.id;

    console.log('Dragging part:', draggedPartId, 'to job line:', targetJobLineId);

    // Find the dragged part
    const draggedPart = parts.find(p => p.id === draggedPartId);
    if (!draggedPart) return;

    // If dropping on the same job line, do nothing
    if (draggedPart.job_line_id === targetJobLineId) return;

    try {
      // Update the part's job line assignment
      const updatedPart = await EditService.updatePart(draggedPartId, {
        job_line_id: targetJobLineId
      });

      // Update local state
      const updatedParts = parts.map(p => 
        p.id === draggedPartId ? updatedPart : p
      );
      onPartsChange(updatedParts);

      toast({
        title: "Success",
        description: `Part moved to job line successfully`,
      });
    } catch (error) {
      console.error('Error updating part assignment:', error);
      toast({
        title: "Error",
        description: "Failed to move part",
        variant: "destructive"
      });
    }
  }, [parts, onPartsChange]);

  return { handleDragEnd };
}
