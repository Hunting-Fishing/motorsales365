import { useState, useEffect, useCallback } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderRepository } from '@/services/workOrder/WorkOrderRepository';
import { useAuthUser } from '@/hooks/useAuthUser';

const workOrderRepository = new WorkOrderRepository();

export function useWorkOrders() {
  const { isAuthenticated, isLoading: authLoading } = useAuthUser();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchWorkOrders = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      console.log('useWorkOrders: User not authenticated, skipping fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('useWorkOrders: Fetching work orders from database...');
      const data = await workOrderRepository.findAll();
      
      setWorkOrders(data);
      console.log('useWorkOrders: Successfully loaded', data.length, 'work orders from database');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch work orders';
      console.error('useWorkOrders: Error fetching work orders:', err);
      setError(errorMessage);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const refetch = useCallback(async () => {
    console.log('useWorkOrders: Manual refetch requested');
    await fetchWorkOrders();
  }, [fetchWorkOrders]);

  const updateWorkOrder = useCallback(async (id: string, updates: Partial<WorkOrder>): Promise<WorkOrder | null> => {
    try {
      console.log('useWorkOrders: Updating work order:', id);
      const updatedWorkOrder = await workOrderRepository.update(id, updates);
      
      if (updatedWorkOrder) {
        // Update local state
        setWorkOrders(prev => prev.map(wo => wo.id === id ? updatedWorkOrder : wo));
        console.log('useWorkOrders: Successfully updated work order');
      }
      
      return updatedWorkOrder;
    } catch (err) {
      console.error('useWorkOrders: Error updating work order:', err);
      throw err;
    }
  }, []);

  const deleteWorkOrder = useCallback(async (id: string): Promise<void> => {
    try {
      console.log('useWorkOrders: Deleting work order:', id);
      await workOrderRepository.delete(id);
      
      // Update local state
      setWorkOrders(prev => prev.filter(wo => wo.id !== id));
      console.log('useWorkOrders: Successfully deleted work order');
    } catch (err) {
      console.error('useWorkOrders: Error deleting work order:', err);
      throw err;
    }
  }, []);

  // Initialize on mount and auth changes
  useEffect(() => {
    if (authLoading) {
      console.log('useWorkOrders: Auth still loading, waiting...');
      return;
    }

    if (!isAuthenticated) {
      console.log('useWorkOrders: User not authenticated, clearing data');
      setWorkOrders([]);
      setError(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    if (!initialized) {
      console.log('useWorkOrders: Initializing work orders fetch...');
      fetchWorkOrders().finally(() => {
        setInitialized(true);
      });
    }
  }, [isAuthenticated, authLoading, initialized, fetchWorkOrders]);

  return {
    workOrders,
    loading: loading || authLoading,
    error,
    refetch,
    updateWorkOrder,
    deleteWorkOrder,
    initialized
  };
}