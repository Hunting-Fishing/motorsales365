
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // Using string for dates consistently
  end: string;   // Using string for dates consistently
  allDay?: boolean;
  description?: string;
  location?: string;
  workOrderId?: string;
  status?: string;
  priority?: string;
  customer?: string;
  technician?: string;
  color?: string;
  type?: 'appointment' | 'work-order' | 'reminder' | 'event' | string;
  
  // Database fields (snake_case)
  work_order_id?: string;
  customer_id?: string;
  technician_id?: string;
  event_type?: string;
  all_day?: boolean;
  start_time?: string;
  end_time?: string;
}

export interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  onClose: () => void;
  isOpen: boolean;
}

export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
  customer_id?: string;
  work_order_id?: string;
  technician_id?: string;
  event_type: string;
  status?: string;
  priority?: string;
  created_by?: string;
}

export interface ShiftChat {
  id: string;
  shift_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  description?: string;
  chat_room_id: string;
  technician_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateShiftChatDto {
  shift_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  description?: string;
  technician_ids?: string[];
}
