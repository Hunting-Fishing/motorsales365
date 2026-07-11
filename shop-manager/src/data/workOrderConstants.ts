import { workOrderSettingsService } from '@/services/settings/workOrderSettingsService';

// DEPRECATED: Use workOrderSettingsService.getAvailableStatuses() instead
// This is kept for backward compatibility but will be removed in future versions
export const WORK_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'body-shop', label: 'Body Shop' },
  { value: 'mobile-service', label: 'Mobile Service' },
  { value: 'needs-road-test', label: 'Needs Road Test' },
  { value: 'parts-requested', label: 'Parts Requested' },
  { value: 'parts-ordered', label: 'Parts Ordered' },
  { value: 'parts-arrived', label: 'Parts Arrived' },
  { value: 'customer-to-return', label: 'Customer to Return' },
  { value: 'rebooked', label: 'Rebooked' },
  { value: 'foreman-signoff-waiting', label: 'Foreman Sign-off Waiting' },
  { value: 'foreman-signoff-complete', label: 'Foreman Sign-off Complete' },
  { value: 'sublet', label: 'Sublet' },
  { value: 'waiting-customer-auth', label: 'Waiting for Customer Auth' },
  { value: 'po-requested', label: 'PO Requested' },
  { value: 'tech-support', label: 'Tech Support' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'internal-ro', label: 'Internal RO' }
];

// DEPRECATED: Use workOrderSettingsService.getAvailablePriorities() instead
// This is kept for backward compatibility but will be removed in future versions
export const WORK_ORDER_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

// DEPRECATED: Use workOrderSettingsService.getDefaults() instead
// This is kept for backward compatibility but will be removed in future versions
export const DEFAULT_WORK_ORDER_VALUES = {
  customer: "",
  description: "",
  status: "pending",
  priority: "medium",
  technician: "",
  location: "",
  dueDate: "",
  notes: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  odometer: "",
  licensePlate: "",
  vin: "",
  inventoryItems: []
};

// Helper functions for easier migration
export async function getWorkOrderStatuses() {
  return await workOrderSettingsService.getAvailableStatuses();
}

export async function getWorkOrderPriorities() {
  return await workOrderSettingsService.getAvailablePriorities();
}

export async function getWorkOrderDefaults() {
  return await workOrderSettingsService.getDefaults();
}
