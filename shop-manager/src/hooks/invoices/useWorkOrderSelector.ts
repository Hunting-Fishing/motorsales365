
import { useState } from 'react';
import { Invoice } from '@/types/invoice';
import { WorkOrder } from '@/types/workOrder';

interface UseWorkOrderSelectorProps {
  invoice: Invoice;
  setInvoice: (invoice: Invoice | ((prev: Invoice) => Invoice)) => void;
  handleSelectWorkOrder: (workOrder: WorkOrder) => any;
}

export const useWorkOrderSelector = ({ 
  invoice, 
  setInvoice, 
  handleSelectWorkOrder 
}: UseWorkOrderSelectorProps) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Custom handler that adds timestamps
  const handleSelectWorkOrderWithTime = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    const workOrderData = handleSelectWorkOrder(workOrder);
    
    // Apply data to invoice
    setInvoice(prev => ({
      ...prev,
      work_order_id: workOrder.id,
      customer: workOrderData.customer,
      customer_address: workOrderData.customerAddress,
      description: workOrderData.description || prev.description,
      assignedStaff: workOrderData.assignedStaff || prev.assignedStaff,
    }));
  };

  return {
    selectedWorkOrder,
    handleSelectWorkOrderWithTime
  };
};
