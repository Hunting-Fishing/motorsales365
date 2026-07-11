
/**
 * Work order status mappings and constants
 */

export type WorkOrderStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold' | 
  'body-shop' | 'mobile-service' | 'needs-road-test' | 'parts-requested' | 'parts-ordered' | 
  'parts-arrived' | 'customer-to-return' | 'rebooked' | 'foreman-signoff-waiting' | 
  'foreman-signoff-complete' | 'sublet' | 'waiting-customer-auth' | 'po-requested' | 
  'tech-support' | 'warranty' | 'internal-ro';

export const statusMap: Record<WorkOrderStatus, string> = {
  'pending': 'Pending',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'on-hold': 'On Hold',
  'body-shop': 'Body Shop',
  'mobile-service': 'Mobile Service',
  'needs-road-test': 'Needs Road Test',
  'parts-requested': 'Parts Requested',
  'parts-ordered': 'Parts Ordered',
  'parts-arrived': 'Parts Arrived',
  'customer-to-return': 'Customer to Return',
  'rebooked': 'Rebooked',
  'foreman-signoff-waiting': 'Foreman Sign-off Waiting',
  'foreman-signoff-complete': 'Foreman Sign-off Complete',
  'sublet': 'Sublet',
  'waiting-customer-auth': 'Waiting for Customer Auth',
  'po-requested': 'PO Requested',
  'tech-support': 'Tech Support',
  'warranty': 'Warranty',
  'internal-ro': 'Internal RO'
};

export const priorityMap: Record<string, { label: string; classes: string }> = {
  'low': {
    label: 'Low',
    classes: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  'medium': {
    label: 'Medium',
    classes: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  'high': {
    label: 'High',
    classes: 'bg-red-100 text-red-800 border-red-200'
  },
  'urgent': {
    label: 'Urgent',
    classes: 'bg-red-200 text-red-900 border-red-300'
  }
};

/**
 * Determine priority based on work order data
 */
export const determinePriority = (workOrder: any): string => {
  // Add logic to determine priority based on work order characteristics
  return workOrder.priority || 'medium';
};
