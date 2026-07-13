
import { useState, useCallback } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderService } from '@/services/workOrder/WorkOrderService';

export interface UseWorkOrderServiceResult {
  workOrders: WorkOrder[];
  loading: boolean;
  error: string | null;
  getWorkOrder: (id: string) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, data: any) => Promise<WorkOrder>;
  updateStatus: (id: string, status: string) => Promise<WorkOrder>;
  deleteWorkOrder: (id: string) => Promise<void>;
  fetchWorkOrders: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useWorkOrderService(): UseWorkOrderServiceResult {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const service = new WorkOrderService();

  const fetchWorkOrders = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('useWorkOrderService: Starting to fetch work orders...');
      
      const orders = await service.getAllWorkOrders();
      console.log('useWorkOrderService: Successfully fetched', orders?.length || 0, 'work orders');
      
      setWorkOrders(orders || []);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch work orders';
      console.error('useWorkOrderService: Error fetching work orders:', err);
      setError(errorMessage);
      setWorkOrders([]); // Clear work orders on error
    } finally {
      setLoading(false);
    }
  }, [service]);

  const getWorkOrder = useCallback(async (id: string): Promise<WorkOrder> => {
    try {
      setError(null);
      console.log('useWorkOrderService: Fetching work order:', id);
      
      const workOrder = await service.getWorkOrderById(id);
      console.log('useWorkOrderService: Successfully fetched work order:', workOrder.id);
      
      return workOrder;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to fetch work order';
      console.error('useWorkOrderService: Error fetching work order:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service]);

  const updateWorkOrder = useCallback(async (id: string, data: any): Promise<WorkOrder> => {
    try {
      setError(null);
      console.log('useWorkOrderService: Updating work order:', id);
      
      const updatedWorkOrder = await service.updateWorkOrder(id, data);
      console.log('useWorkOrderService: Successfully updated work order:', updatedWorkOrder.id);
      
      // Update the work order in the local state
      setWorkOrders(prev => prev.map(wo => 
        wo.id === id ? updatedWorkOrder : wo
      ));
      
      return updatedWorkOrder;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update work order';
      console.error('useWorkOrderService: Error updating work order:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<WorkOrder> => {
    try {
      setError(null);
      console.log('useWorkOrderService: Updating work order status:', id, 'to', status);
      
      const updatedWorkOrder = await service.updateWorkOrderStatus(id, status);
      console.log('useWorkOrderService: Successfully updated work order status:', updatedWorkOrder.id);
      
      // Update the work order in the local state
      setWorkOrders(prev => prev.map(wo => 
        wo.id === id ? updatedWorkOrder : wo
      ));
      
      return updatedWorkOrder;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to update work order status';
      console.error('useWorkOrderService: Error updating work order status:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service]);

  const deleteWorkOrder = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      console.log('useWorkOrderService: Deleting work order:', id);
      
      await service.deleteWorkOrder(id);
      console.log('useWorkOrderService: Successfully deleted work order:', id);
      
      // Remove the work order from the local state
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to delete work order';
      console.error('useWorkOrderService: Error deleting work order:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [service]);

  // Alias for fetchWorkOrders to maintain compatibility
  const refetch = useCallback(async (): Promise<void> => {
    await fetchWorkOrders();
  }, [fetchWorkOrders]);

  return {
    workOrders,
    loading,
    error,
    getWorkOrder,
    updateWorkOrder,
    updateStatus,
    deleteWorkOrder,
    fetchWorkOrders,
    refetch,
  };
}
