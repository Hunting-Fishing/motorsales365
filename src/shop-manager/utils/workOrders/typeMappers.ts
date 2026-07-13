
import { WorkOrder } from '@/types/workOrder';
import { WorkOrderStatus } from '@/utils/workOrders/constants';

/**
 * Safely convert database work order data to application format
 */
export const mapDatabaseWorkOrder = (dbData: any): WorkOrder => {
  // Ensure status is properly typed
  const status = dbData.status as WorkOrderStatus;
  
  return {
    ...dbData,
    status,
    // Handle vehicle field - can be object or string
    vehicle: typeof dbData.vehicle === 'string' ? { id: dbData.vehicle } : dbData.vehicle,
    // Ensure arrays are properly initialized
    timeEntries: dbData.timeEntries || [],
    inventoryItems: dbData.inventoryItems || dbData.inventory_items || [],
  } as WorkOrder;
};

/**
 * Convert work order status string to typed status
 */
export const convertStatusToTyped = (status: string): WorkOrderStatus => {
  // Check if the status is a valid WorkOrderStatus
  const validStatuses = [
    'pending', 'in-progress', 'completed', 'cancelled', 'on-hold',
    'body-shop', 'mobile-service', 'needs-road-test', 'parts-requested',
    'parts-ordered', 'parts-arrived', 'customer-to-return', 'rebooked',
    'foreman-signoff-waiting', 'foreman-signoff-complete', 'sublet',
    'waiting-customer-auth', 'po-requested', 'tech-support', 'warranty', 'internal-ro'
  ];
  
  if (validStatuses.includes(status)) {
    return status as WorkOrderStatus;
  }
  
  // Default fallback
  return 'pending' as WorkOrderStatus;
};
