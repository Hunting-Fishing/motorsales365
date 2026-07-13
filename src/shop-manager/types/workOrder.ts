
import { WorkOrderStatus } from '@/utils/workOrders/constants';

// Base interfaces
export interface TimeEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  start_time: string;
  end_time?: string;
  duration: number;
  notes?: string;
  billable: boolean;
  work_order_id: string;
  created_at: string;
}

export interface WorkOrderInventoryItem {
  id?: string; // Make id optional since items might not have IDs when being created
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes?: string;
  itemStatus?: string;
  estimatedArrivalDate?: string;
  supplierName?: string;
  supplierCost?: number;
  customerPrice?: number;
  retailPrice?: number;
  partType?: string;
  markupPercentage?: number;
  isTaxable?: boolean;
  coreChargeAmount?: number;
  coreChargeApplied?: boolean;
  warrantyDuration?: string;
  invoiceNumber?: string;
  poLine?: string;
  isStockItem?: boolean;
  notesInternal?: string;
  inventoryItemId?: string;
  supplierOrderRef?: string;
}

// Use WorkOrderVehicle to avoid conflicts with the main Vehicle type
export interface WorkOrderVehicle {
  id?: string;
  make?: string;
  model?: string;
  year?: string | number;
  license_plate?: string;
  vin?: string;
  odometer?: string;
}

// Main WorkOrder interface - flexible for database compatibility
export interface WorkOrder {
  id: string;
  // Core required fields
  status: WorkOrderStatus | string; // Allow both enum and string for database compatibility
  description?: string;
  
  // Database fields (snake_case)
  shop_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  advisor_id?: string;
  technician_id?: string;
  estimated_hours?: number;
  total_cost?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  start_time?: string;
  end_time?: string;
  service_category_id?: string;
  invoiced_at?: string;
  service_type?: string;
  invoice_id?: string;
  work_order_number?: string;
  
  // Customer fields - both legacy and new format
  customer_name?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_postal_code?: string;
  
  // Vehicle fields
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vehicle_license_plate?: string;
  vehicle_vin?: string;
  vehicle_odometer?: string;
  
  // Legacy/compatibility fields (camelCase)
  customer?: string;
  technician?: string;
  date?: string;
  dueDate?: string;
  due_date?: string;
  priority?: string;
  location?: string;
  notes?: string;
  vehicle?: WorkOrderVehicle | string;
  
  // Time tracking
  total_billable_time?: number;
  timeEntries?: TimeEntry[];
  
  // Inventory
  inventoryItems?: WorkOrderInventoryItem[];
  inventory_items?: WorkOrderInventoryItem[];
  
  // Equipment
  equipment_name?: string;
  asset_number?: string;
}

// Enhanced form-related types to include all fields being used
export interface WorkOrderFormValues {
  // Basic fields
  customer: string;
  description: string;
  status: string;
  priority: string;
  technician: string;
  location: string;
  dueDate: string;
  notes: string;
  
  // Vehicle fields
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  licensePlate: string;
  vin: string;
  odometer: string;
  
  // Inventory
  inventoryItems: WorkOrderInventoryItem[];
  
  // Extended fields that might be used in forms
  customerId?: string;
  vehicleId?: string;
  technicianId?: string;
  serviceType?: string;
  estimatedHours?: number;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
}

// Template interface
export interface WorkOrderTemplate {
  id: string;
  name: string;
  description: string;
  status?: string;
  priority?: string;
  technician?: string;
  notes?: string;
  location?: string;
  usage_count?: number;
  last_used?: string;
  created_at?: string;
  updated_at?: string;
  inventory_items?: WorkOrderInventoryItem[];
}

// Type aliases for backward compatibility
export type WorkOrderStatusType = WorkOrderStatus;

// Re-export types from constants using export type
export type { WorkOrderStatus } from '@/utils/workOrders/constants';
export { statusMap, priorityMap } from '@/utils/workOrders/constants';
