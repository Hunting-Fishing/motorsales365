
import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { WorkOrder } from '@/types/workOrder';
import { getWorkOrdersByCustomerId } from '@/services/workOrder';

export function useCustomerDetails(customerId: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customerId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // For now, just fetch work orders
        // Customer data would need to be fetched from customer service
        const orders = await getWorkOrdersByCustomerId(customerId);
        setWorkOrders(orders);
      } catch (err) {
        console.error('Error fetching customer details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [customerId]);

  return {
    customer,
    workOrders,
    loading,
    error,
    refetch: () => {
      // Trigger refetch if needed
    }
  };
}
