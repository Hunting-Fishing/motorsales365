
import { useState, useEffect, useCallback } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderService } from '@/services/workOrder/WorkOrderService';

export function useWorkOrdersByCustomer(customerId: string) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const service = new WorkOrderService();

  const fetchWorkOrders = useCallback(async () => {
    if (!customerId) {
      setWorkOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching work orders for customer:', customerId);
      const data = await service.getWorkOrdersByCustomer(customerId);
      console.log('Work orders fetched:', data?.length || 0);
      setWorkOrders(data || []);
    } catch (err) {
      console.error('Error fetching work orders by customer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch work orders';
      setError(errorMessage);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, service]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  return { workOrders, loading, error, refetch: fetchWorkOrders };
}
