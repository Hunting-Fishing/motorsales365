export type ConflictType = 
  | 'double_booking' 
  | 'overlapping_shift' 
  | 'time_off_conflict' 
  | 'accommodation_conflict' 
  | 'overtime' 
  | 'understaffed';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SchedulingConflict {
  id: string;
  shop_id: string;
  conflict_type: string;
  severity: string;
  employee_id: string | null;
  schedule_assignment_id: string | null;
  conflicting_assignment_id: string | null;
  time_off_request_id: string | null;
  conflict_date: string;
  conflict_start_time: string | null;
  conflict_end_time: string | null;
  description: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface SchedulingStatistics {
  id: string;
  shop_id: string;
  stat_date: string;
  total_scheduled_hours: number;
  total_employees_scheduled: number;
  total_shifts: number;
  coverage_percentage: number;
  active_conflicts: number;
  critical_conflicts: number;
  understaffed_shifts: number;
  overstaffed_shifts: number;
  overtime_hours: number;
  labor_cost_estimate: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}
