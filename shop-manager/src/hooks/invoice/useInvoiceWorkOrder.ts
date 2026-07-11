
import { Invoice } from '@/types/invoice';
import { WorkOrder } from '@/types/workOrder';

export const useInvoiceWorkOrder = () => {
  const handleSelectWorkOrder = (workOrder: WorkOrder) => {
    if (!workOrder) return { workOrderId: '', customer: '', customerAddress: '', assignedStaff: [] };

    // Handle potentially missing properties safely with fallbacks
    return {
      workOrderId: workOrder.id,
      customer: workOrder.customer || '',
      customerAddress: workOrder.location || '', // Use location field
      description: workOrder.description || '',
      assignedStaff: workOrder.technician ? [{ id: workOrder.technician_id || '', name: workOrder.technician }] : []
    };
  };

  return { handleSelectWorkOrder };
};
