import { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { 
  createWorkOrderJobLine, 
  updateWorkOrderJobLine, 
  deleteWorkOrderJobLine,
  updateJobLineCompletion,
  reorderJobLines,
  toggleJobLineStatus
} from '@/services/workOrder/jobLineOperations';
import { toast } from 'sonner';

export function useWorkOrderJobLineOperations(
  jobLines: WorkOrderJobLine[],
  onRefresh: () => Promise<void>
) {
  const [isOperating, setIsOperating] = useState(false);

  const handleAddJobLine = async (
    jobLineData: Omit<WorkOrderJobLine, 'id' | 'created_at' | 'updated_at'>
  ) => {
    if (isOperating) return;
    
    try {
      setIsOperating(true);
      
      await createWorkOrderJobLine(jobLineData);
      
      toast.success('Job line added successfully');
      await onRefresh();
    } catch (error) {
      console.error('Error adding job line:', error);
      toast.error('Failed to add job line');
    } finally {
      setIsOperating(false);
    }
  };

  const handleUpdateJobLine = async (updatedJobLine: WorkOrderJobLine) => {
    if (isOperating) return;
    
    // Check if this is a temporary ID (starts with 'temp-' or 'service-')
    if (updatedJobLine.id.startsWith('temp-') || updatedJobLine.id.startsWith('service-')) {
      console.log('Cannot update temporary job line:', updatedJobLine.id);
      toast.error('Cannot update unsaved job line. Please save first.');
      return;
    }
    
    try {
      setIsOperating(true);
      
      await updateWorkOrderJobLine(updatedJobLine.id, updatedJobLine);
      
      toast.success('Job line updated successfully');
      await onRefresh();
    } catch (error) {
      console.error('Error updating job line:', error);
      toast.error('Failed to update job line');
    } finally {
      setIsOperating(false);
    }
  };

  const handleDeleteJobLine = async (jobLineId: string) => {
    if (isOperating) return;
    
    // Check if this is a temporary ID (starts with 'temp-' or 'service-')
    if (jobLineId.startsWith('temp-') || jobLineId.startsWith('service-')) {
      console.log('Skipping delete for temporary job line:', jobLineId);
      toast.error('Cannot delete unsaved job line. Please save first.');
      return;
    }
    
    try {
      setIsOperating(true);
      
      await deleteWorkOrderJobLine(jobLineId);
      
      toast.success('Job line deleted successfully');
      await onRefresh();
    } catch (error) {
      console.error('Error deleting job line:', error);
      toast.error('Failed to delete job line');
    } finally {
      setIsOperating(false);
    }
  };

  const handleToggleCompletion = async (jobLine: WorkOrderJobLine, completed: boolean) => {
    if (isOperating) return;
    
    try {
      setIsOperating(true);
      
      await updateJobLineCompletion(jobLine.id, completed);
      
      toast.success(`Job line marked as ${completed ? 'completed' : 'pending'}`);
      await onRefresh();
    } catch (error) {
      console.error('Error updating completion status:', error);
      toast.error('Failed to update completion status');
    } finally {
      setIsOperating(false);
    }
  };

  const handleReorderJobLines = async (reorderedJobLines: WorkOrderJobLine[]) => {
    if (isOperating) return;
    
    try {
      setIsOperating(true);
      
      await reorderJobLines(reorderedJobLines);
      
      // Optionally show success message for reordering
      await onRefresh();
    } catch (error) {
      console.error('Error reordering job lines:', error);
      toast.error('Failed to reorder job lines');
    } finally {
      setIsOperating(false);
    }
  };

  const handleStatusChange = async (jobLineId: string, newStatus: 'pending' | 'in-progress' | 'completed' | 'on-hold') => {
    if (isOperating) return;
    
    try {
      setIsOperating(true);
      
      await toggleJobLineStatus(jobLineId, newStatus);
      
      toast.success(`Status changed to ${newStatus}`);
      await onRefresh();
    } catch (error) {
      console.error('Error changing status:', error);
      toast.error('Failed to change status');
    } finally {
      setIsOperating(false);
    }
  };

  return {
    isOperating,
    handleAddJobLine,
    handleUpdateJobLine,
    handleDeleteJobLine,
    handleToggleCompletion,
    handleReorderJobLines,
    handleStatusChange
  };
}