
import { useState, useEffect, useCallback } from 'react';
import { WorkOrderPart, WorkOrderPartFormValues } from '@/types/workOrderPart';
import { 
  getWorkOrderParts, 
  createWorkOrderPart, 
  updateWorkOrderPart, 
  deleteWorkOrderPart 
} from '@/services/workOrder/workOrderPartsService';
import { toast } from 'sonner';

export function useWorkOrderPartsData(workOrderId: string) {
  const [parts, setParts] = useState<WorkOrderPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParts = useCallback(async () => {
    if (!workOrderId) {
      console.log('No work order ID provided, skipping parts fetch');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching parts for work order:', workOrderId);
      
      const partsData = await getWorkOrderParts(workOrderId);
      console.log('Parts fetched successfully:', partsData.length, 'parts');
      setParts(partsData);
    } catch (err) {
      console.error('Error fetching parts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch parts';
      setError(errorMessage);
      
      // Only show toast for unexpected errors, not for empty results
      if (!errorMessage.includes('No parts found')) {
        toast.error(`Failed to load parts: ${errorMessage}`);
      }
      
      // Set empty array on error to prevent showing stale data
      setParts([]);
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId]);

  const refreshParts = useCallback(async () => {
    console.log('Refreshing parts data...');
    await fetchParts();
  }, [fetchParts]);

  // Add part operation
  const addPart = useCallback(async (partData: WorkOrderPartFormValues): Promise<WorkOrderPart> => {
    try {
      setIsLoading(true);
      console.log('Adding new part:', partData);

      const newPart = await createWorkOrderPart({
        ...partData,
        work_order_id: workOrderId,
      });

      console.log('Part added successfully:', newPart);
      
      // Refresh parts list to get the latest data
      await fetchParts();
      
      toast.success('Part added successfully');
      return newPart;
    } catch (err) {
      console.error('Error adding part:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add part';
      setError(errorMessage);
      toast.error(`Failed to add part: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [workOrderId, fetchParts]);

  // Update part operation
  const updatePart = useCallback(async (partId: string, updates: Partial<WorkOrderPart>): Promise<WorkOrderPart> => {
    try {
      setIsLoading(true);
      console.log('Updating part:', partId, updates);

      const updatedPart = await updateWorkOrderPart(partId, updates);

      console.log('Part updated successfully:', updatedPart);
      
      // Update local state optimistically
      setParts(prevParts => 
        prevParts.map(part => 
          part.id === partId ? updatedPart : part
        )
      );
      
      toast.success('Part updated successfully');
      return updatedPart;
    } catch (err) {
      console.error('Error updating part:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update part';
      setError(errorMessage);
      toast.error(`Failed to update part: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete part operation
  const deletePart = useCallback(async (partId: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Deleting part:', partId);

      await deleteWorkOrderPart(partId);

      console.log('Part deleted successfully:', partId);
      
      // Remove from local state
      setParts(prevParts => prevParts.filter(part => part.id !== partId));
      
      toast.success('Part deleted successfully');
    } catch (err) {
      console.error('Error deleting part:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete part';
      setError(errorMessage);
      toast.error(`Failed to delete part: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reorder parts operation
  const reorderParts = useCallback(async (partIds: string[]): Promise<void> => {
    try {
      console.log('Reordering parts:', partIds);
      
      // For now, just update local state since we don't have a backend reorder API
      // In a real app, you'd send the new order to the backend
      const reorderedParts = partIds.map(id => 
        parts.find(part => part.id === id)
      ).filter(Boolean) as WorkOrderPart[];
      
      setParts(reorderedParts);
      console.log('Parts reordered successfully');
    } catch (err) {
      console.error('Error reordering parts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder parts';
      setError(errorMessage);
      toast.error(`Failed to reorder parts: ${errorMessage}`);
      throw err;
    }
  }, [parts]);

  useEffect(() => {
    if (workOrderId) {
      fetchParts();
    } else {
      setIsLoading(false);
      setParts([]);
      setError(null);
    }
  }, [workOrderId, fetchParts]);

  return {
    parts,
    isLoading,
    error,
    refreshParts,
    addPart,
    updatePart,
    deletePart,
    reorderParts
  };
}
