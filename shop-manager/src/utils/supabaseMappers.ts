
import { WorkOrder } from "@/types/workOrder";
import { WorkOrderInventoryItem, TimeEntry } from "@/types/workOrder";

// Maps our application WorkOrder type to Supabase database format
export const mapToDbWorkOrder = (workOrder: Partial<WorkOrder>) => {
  return {
    id: workOrder.id,
    customer: workOrder.customer,
    description: workOrder.description,
    status: workOrder.status,
    priority: workOrder.priority,
    date: workOrder.date,
    due_date: workOrder.dueDate,
    technician: workOrder.technician,
    location: workOrder.location,
    notes: workOrder.notes,
    total_billable_time: workOrder.total_billable_time,
    created_at: workOrder.created_at,
    updated_at: workOrder.updated_at
  };
};

// Maps from Supabase to our application WorkOrder format
export const mapFromDbWorkOrder = (dbWorkOrder: any, timeEntries: TimeEntry[] = [], inventoryItems: WorkOrderInventoryItem[] = []): WorkOrder => {
  return {
    id: dbWorkOrder.id,
    customer: dbWorkOrder.customer,
    description: dbWorkOrder.description || '',
    status: dbWorkOrder.status,
    priority: dbWorkOrder.priority,
    date: dbWorkOrder.date,
    dueDate: dbWorkOrder.due_date,
    technician: dbWorkOrder.technician,
    location: dbWorkOrder.location,
    notes: dbWorkOrder.notes || '',
    total_billable_time: dbWorkOrder.total_billable_time || 0,
    created_at: dbWorkOrder.created_at,
    updated_at: dbWorkOrder.updated_at,
    timeEntries,
    inventoryItems
  };
};

// Map time entry from DB format to app format
export const mapTimeEntryFromDb = (entry: any): TimeEntry => ({
  id: entry.id,
  employee_id: entry.employee_id,
  employee_name: entry.employee_name,
  start_time: entry.start_time,
  end_time: entry.end_time,
  duration: entry.duration,
  notes: entry.notes,
  billable: entry.billable,
  work_order_id: entry.work_order_id || '',
  created_at: entry.created_at || new Date().toISOString()
});

// Map inventory item from DB format to app format
export const mapInventoryItemFromDb = (item: any): WorkOrderInventoryItem => ({
  id: item.id,
  name: item.name,
  sku: item.sku,
  category: item.category,
  quantity: item.quantity,
  unit_price: item.unit_price,
  total: item.total || (item.quantity * item.unit_price)
});
