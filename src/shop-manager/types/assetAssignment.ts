export type AssetType = 'equipment' | 'vessel' | 'vehicle';
export type AssignmentStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface AssetAssignment {
  id: string;
  shop_id: string;
  employee_id: string;
  asset_type: AssetType;
  asset_id: string;
  assignment_start: string;
  assignment_end: string;
  purpose?: string;
  notes?: string;
  status: AssignmentStatus;
  assigned_by?: string;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
  parent_assignment_id?: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateAssetAssignmentInput {
  employee_id: string;
  asset_type: AssetType;
  asset_id: string;
  assignment_start: string;
  assignment_end: string;
  purpose?: string;
  notes?: string;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_days_of_week?: number[];
}
