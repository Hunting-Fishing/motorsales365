// Comprehensive Maintenance Planning Types

export type IntervalMetric = 'days' | 'weeks' | 'months' | 'years' | 'mileage' | 'hours' | 'engine_hours';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus = 'scheduled' | 'due_soon' | 'overdue' | 'completed' | 'cancelled';
export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
export type RequisitionStatus = 'pending' | 'approved' | 'ordered' | 'received' | 'cancelled';

export interface MaintenanceSchedule {
  id: string;
  title: string;
  description?: string;
  vehicle_id?: string;
  equipment_id?: string;
  customer_id?: string;
  
  // Interval configuration (from existing table)
  interval_months: number;
  interval_miles?: number;
  
  // Current status (from existing table)
  last_service_date?: string;
  last_service_mileage?: number;
  current_mileage?: number;
  next_due_date: string;
  next_due_mileage?: number;
  
  // Planning
  estimated_cost?: number;
  estimated_duration?: number;
  assigned_technician_id?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface MaintenanceBudget {
  id: string;
  budget_name: string;
  description?: string;
  
  // Period
  budget_period: BudgetPeriod;
  start_date: string;
  end_date: string;
  
  // Budget allocations
  total_budget: number;
  parts_budget: number;
  labor_budget: number;
  external_services_budget: number;
  
  // Actual spending
  total_spent: number;
  parts_spent: number;
  labor_spent: number;
  external_services_spent: number;
  
  // Forecasts
  forecasted_total: number;
  
  status: 'draft' | 'active' | 'completed' | 'exceeded';
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisition {
  id: string;
  requisition_number: string;
  
  // Source
  source_type: 'scheduled_maintenance' | 'low_stock' | 'manual';
  source_id?: string;
  
  // Details
  title: string;
  description?: string;
  required_by_date?: string;
  priority: MaintenancePriority;
  
  // Budget
  estimated_total: number;
  budget_id?: string;
  
  // Status
  status: RequisitionStatus;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  
  // Items
  items?: PurchaseRequisitionItem[];
  
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequisitionItem {
  id: string;
  purchase_requisition_id: string;
  inventory_item_id?: string;
  part_number?: string;
  part_name: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  estimated_total: number;
  supplier?: string;
  notes?: string;
}

export interface MaintenanceServiceItem {
  id: string;
  inventory_item_id?: string;
  part_name: string;
  part_number?: string;
  quantity: number;
  unit: string;
  estimated_unit_cost: number;
  is_critical: boolean;
  notes?: string;
}

export interface MaintenanceCalendarEvent {
  id: string;
  maintenance_schedule_id?: string;
  asset_id: string;
  asset_name: string;
  asset_type: 'vehicle' | 'equipment';
  
  // Schedule
  scheduled_date: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  
  // Work order reference
  work_order_id?: string;
  
  // Assignment
  assigned_to?: string;
  
  // Status
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Predictive maintenance result
export interface MaintenancePrediction {
  scheduleId: string;
  assetId: string;
  assetName: string;
  maintenanceType: string;
  
  // Predictions
  predictedDueDate: string;
  predictedDueMileage?: number;
  daysUntilDue: number;
  confidenceLevel: number;
  
  // Requirements
  estimatedCost: number;
  estimatedDuration: number;
  requiredParts: MaintenanceServiceItem[];
  
  // Recommendations
  recommendedScheduleDate: string;
  autoReorderDate?: string;
  priority: MaintenancePriority;
}
