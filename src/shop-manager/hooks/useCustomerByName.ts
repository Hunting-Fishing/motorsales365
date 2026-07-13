
import { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import { WorkOrder } from '@/types/workOrder';
import { searchCustomers } from '@/services/customers';
import { getWorkOrdersByCustomerId } from '@/services/workOrder/workOrderQueryService';

export const useCustomerByName = (customerName: string) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerByName = async () => {
      if (!customerName) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Search for customers by name
        const customers = await searchCustomers(customerName);
        
        if (customers.length === 0) {
          setError('Customer not found');
          setLoading(false);
          return;
        }
        
        // Find exact match or take the first result
        const foundCustomer = customers.find(c => 
          `${c.first_name} ${c.last_name}`.toLowerCase() === customerName.toLowerCase()
        ) || customers[0];
        
        setCustomer(foundCustomer);
        
        // Fetch work orders for this customer
        const customerWorkOrders = await getWorkOrdersByCustomerId(foundCustomer.id);
        setWorkOrders(customerWorkOrders);
        
      } catch (err) {
        console.error('Error fetching customer by name:', err);
        setError(err instanceof Error ? err.message : 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerByName();
  }, [customerName]);

  return {
    customer,
    workOrders,
    loading,
    error,
    refetch: () => {
      if (customerName) {
        const fetchData = async () => {
          try {
            setLoading(true);
            const customers = await searchCustomers(customerName);
            if (customers.length > 0) {
              const foundCustomer = customers.find(c => 
                `${c.first_name} ${c.last_name}`.toLowerCase() === customerName.toLowerCase()
              ) || customers[0];
              setCustomer(foundCustomer);
              const customerWorkOrders = await getWorkOrdersByCustomerId(foundCustomer.id);
              setWorkOrders(customerWorkOrders);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh data');
          } finally {
            setLoading(false);
          }
        };
        fetchData();
      }
    }
  };
};
