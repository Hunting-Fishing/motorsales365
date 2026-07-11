
import { useState } from 'react';
import { Invoice } from '@/types/invoice';
import { WorkOrder } from '@/types/workOrder';
import { Dispatch, SetStateAction } from 'react';

interface UseWorkOrderSelectorProps {
  invoice: Invoice;
  setInvoice: Dispatch<SetStateAction<Invoice>>;
  handleSelectWorkOrder: (workOrder: WorkOrder) => void;
}

export const useWorkOrderSelector = ({ 
  invoice, 
  setInvoice, 
  handleSelectWorkOrder 
}: UseWorkOrderSelectorProps) => {
  
  const handleSelectWorkOrderWithTime = (workOrder: WorkOrder) => {
    console.log('Selecting work order with time tracking data:', workOrder);
    handleSelectWorkOrder(workOrder);
  };

  return {
    handleSelectWorkOrderWithTime
  };
};
