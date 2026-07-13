
import { useState, useCallback } from 'react';
import { useWorkOrderService } from './useWorkOrderService';

export function useWorkOrderStatus(workOrderId: string, initialStatus: string) {
  const [status, setStatus] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { updateStatus: updateWorkOrderStatus } = useWorkOrderService();

  const updateStatus = useCallback(async (newStatus: string) => {
    if (newStatus === status) return { success: true, data: null };
    
    setIsUpdating(true);
    setError(null);
    
    try {
      console.log('useWorkOrderStatus: Updating status from', status, 'to', newStatus);
      
      const updatedWorkOrder = await updateWorkOrderStatus(workOrderId, newStatus);
      
      if (updatedWorkOrder) {
        setStatus(newStatus);
        return { success: true, data: updatedWorkOrder };
      } else {
        throw new Error('Failed to update work order');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update work order status';
      setError(errorMessage);
      console.error('useWorkOrderStatus: Error updating status:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  }, [workOrderId, status, updateWorkOrderStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    status,
    isUpdating,
    error,
    updateStatus,
    clearError
  };
}
