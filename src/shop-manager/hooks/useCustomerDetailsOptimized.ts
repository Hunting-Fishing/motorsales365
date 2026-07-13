
import { useState, useEffect } from 'react';
import { Customer, CustomerNote } from '@sm/types/customer';
import { CustomerCommunication } from '@sm/types/customer/notes';
import { WorkOrder } from '@sm/types/workOrder';
import { CustomerLoyalty } from '@sm/types/loyalty';
import { CustomerInteraction } from '@sm/types/interaction';
import { getCustomerById } from '@sm/services/customer/customerQueryService';
import { getWorkOrdersByCustomerId } from '@sm/services/workOrder/workOrderQueryService';
import { getCustomerNotes } from '@sm/services/customer/customerNotesService';
import { getCustomerLoyalty } from '@sm/services/loyalty/customerLoyaltyService';
import { getCustomerInteractions } from '@sm/services/customer/interactions/interactionQueryService';
import { getCustomerCommunications } from '@sm/services/customer/communicationsService';

export const useCustomerDetailsOptimized = (customerId: string) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);
  const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyalty | null>(null);
  const [customerInteractions, setCustomerInteractions] = useState<CustomerInteraction[]>([]);
  const [customerCommunications, setCustomerCommunications] = useState<CustomerCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      if (!customerId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch customer data, work orders, notes, loyalty, interactions, and communications in parallel
        const [customerData, workOrdersData, notesData, loyaltyData, interactionsData, communicationsData] = await Promise.all([
          getCustomerById(customerId),
          getWorkOrdersByCustomerId(customerId),
          getCustomerNotes(customerId),
          getCustomerLoyalty(customerId),
          getCustomerInteractions(customerId),
          getCustomerCommunications(customerId)
        ]);
        
        setCustomer(customerData);
        setWorkOrders(workOrdersData);
        setCustomerNotes(notesData);
        setCustomerLoyalty(loyaltyData);
        setCustomerInteractions(interactionsData);
        setCustomerCommunications(communicationsData);
        
      } catch (err) {
        console.error('Error fetching customer details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [customerId]);

  return {
    customer,
    workOrders,
    customerNotes,
    customerLoyalty,
    customerInteractions,
    customerCommunications,
    loading,
    error,
    refetch: () => {
      // Re-fetch data when needed
      if (customerId) {
        const fetchData = async () => {
          try {
            setLoading(true);
            const [customerData, workOrdersData, notesData, loyaltyData, interactionsData, communicationsData] = await Promise.all([
              getCustomerById(customerId),
              getWorkOrdersByCustomerId(customerId),
              getCustomerNotes(customerId),
              getCustomerLoyalty(customerId),
              getCustomerInteractions(customerId),
              getCustomerCommunications(customerId)
            ]);
            setCustomer(customerData);
            setWorkOrders(workOrdersData);
            setCustomerNotes(notesData);
            setCustomerLoyalty(loyaltyData);
            setCustomerInteractions(interactionsData);
            setCustomerCommunications(communicationsData);
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
