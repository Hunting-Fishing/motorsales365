
// Technician-related type definitions
export interface TechnicianStatus {
  id: string;
  technician_id: string;
  status: string;
  timestamp: string;
  changed_by: string;
}

export interface TechnicianSchedule {
  id: string;
  technician_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string;
}
