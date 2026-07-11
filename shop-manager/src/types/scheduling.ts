export interface TimeOffType {
  id: string;
  shop_id: string;
  name: string;
  code: string;
  is_paid: boolean;
  requires_approval: boolean;
  max_days_per_year: number | null;
  color: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeOffRequest {
  id: string;
  shop_id: string;
  employee_id: string;
  time_off_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  time_off_types?: TimeOffType;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface EmployeeAccommodation {
  id: string;
  shop_id: string;
  employee_id: string;
  accommodation_type: 'medical' | 'religious' | 'personal' | 'disability' | 'other';
  description: string;
  start_date: string | null;
  end_date: string | null;
  is_permanent: boolean;
  approved_by: string | null;
  approved_at: string | null;
  status: 'active' | 'inactive' | 'expired';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkScheduleAssignment {
  id: string;
  shop_id: string;
  employee_id: string;
  schedule_name: string;
  day_of_week: number;
  shift_start: string;
  shift_end: string;
  is_recurring: boolean;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export interface PTOBalance {
  id: string;
  shop_id: string;
  employee_id: string;
  time_off_type_id: string;
  year: number;
  total_allocated: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
  time_off_types?: TimeOffType;
}
