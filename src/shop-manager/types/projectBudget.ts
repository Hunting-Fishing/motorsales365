export interface ProjectBudget {
  id: string;
  shop_id: string;
  project_name: string;
  project_code: string | null;
  description: string | null;
  project_type: string;
  status: string;
  priority: string;
  original_budget: number;
  approved_budget: number | null;
  current_budget: number | null;
  contingency_amount: number;
  contingency_percent: number;
  committed_amount: number;
  actual_spent: number;
  forecasted_total: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  requires_approval: boolean;
  approval_threshold: number;
  approved_by: string | null;
  approved_at: string | null;
  equipment_id: string | null;
  vehicle_id: string | null;
  customer_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  phases?: ProjectPhase[];
  cost_items?: ProjectCostItem[];
  change_orders?: ProjectChangeOrder[];
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string;
  phase_order: number;
  description: string | null;
  phase_budget: number;
  actual_spent: number;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  percent_complete: number;
  status: string;
  depends_on_phase_id: string | null;
  color: string | null;
  is_milestone: boolean;
  milestone_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCostItem {
  id: string;
  project_id: string;
  phase_id: string | null;
  category: string;
  description: string | null;
  budgeted_amount: number;
  committed_amount: number;
  actual_spent: number;
  vendor_id: string | null;
  purchase_order_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectChangeOrder {
  id: string;
  project_id: string;
  change_order_number: string;
  reason: string;
  description: string | null;
  amount_change: number;
  original_budget: number | null;
  new_budget: number | null;
  status: string;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  documents: any[];
  created_at: string;
}

export interface ProjectBudgetSnapshot {
  id: string;
  project_id: string;
  snapshot_date: string;
  snapshot_type: string;
  total_budget: number | null;
  total_committed: number | null;
  total_spent: number | null;
  forecasted_total: number | null;
  phase_data: any;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type ProjectStatus = 'planning' | 'approved' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'capital' | 'maintenance' | 'construction' | 'overhaul' | 'repair';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type ChangeOrderStatus = 'pending' | 'approved' | 'rejected';

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: 'bg-blue-500' },
  { value: 'approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-orange-500' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'capital', label: 'Capital Project' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'construction', label: 'Construction' },
  { value: 'overhaul', label: 'Overhaul' },
  { value: 'repair', label: 'Repair' },
];

export const COST_CATEGORIES = [
  'labor',
  'parts',
  'materials',
  'subcontractor',
  'equipment_rental',
  'permits',
  'travel',
  'overhead',
  'other',
];
