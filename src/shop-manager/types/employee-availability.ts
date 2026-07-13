export interface EmployeeAvailability {
  id: string;
  shop_id: string;
  employee_id: string;
  day_of_week: number;
  available_start: string;
  available_end: string;
  is_available: boolean;
  recurring: boolean;
  effective_from: string;
  effective_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequest {
  id: string;
  shop_id: string;
  requesting_employee_id: string;
  target_employee_id: string | null;
  original_schedule_id: string;
  proposed_schedule_id: string | null;
  swap_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  requesting_employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  target_employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ScheduleNotification {
  id: string;
  shop_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}
