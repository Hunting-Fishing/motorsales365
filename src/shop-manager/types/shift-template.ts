export interface ShiftTemplate {
  id: string;
  shop_id: string;
  template_name: string;
  description: string | null;
  shift_start: string;
  shift_end: string;
  days_of_week: number[];
  break_duration_minutes: number;
  is_active: boolean;
  color: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCoverage {
  shop_id: string;
  day_of_week: number;
  hour_block: string;
  employee_count: number;
  employee_ids: string[];
  employee_names: string[];
}
