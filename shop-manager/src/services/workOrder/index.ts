
// Export the main service classes and functions
export { WorkOrderService } from './WorkOrderService';
export { WorkOrderRepository } from './WorkOrderRepository';

// Export the main hook
export { useWorkOrderService } from '@/hooks/useWorkOrderService';

// Legacy exports for backward compatibility
export { WorkOrderService as default } from './WorkOrderService';

// Create singleton instances for immediate use
import { WorkOrderService } from './WorkOrderService';
const workOrderService = new WorkOrderService();

export const getAllWorkOrders = () => workOrderService.getAllWorkOrders();
export const getWorkOrderById = (id: string) => workOrderService.getWorkOrderById(id);
export const createWorkOrder = (data: any) => workOrderService.createWorkOrder(data);
export const updateWorkOrder = (id: string, data: any) => workOrderService.updateWorkOrder(id, data);
export const updateWorkOrderStatus = (id: string, status: string) => workOrderService.updateWorkOrderStatus(id, status);
export const deleteWorkOrder = (id: string) => workOrderService.deleteWorkOrder(id);
