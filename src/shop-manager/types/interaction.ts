
export type InteractionType = 
  | 'work_order'
  | 'communication' 
  | 'parts' 
  | 'service' 
  | 'follow_up';

export type InteractionStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed' 
  | 'cancelled';

export interface CustomerInteraction {
  id: string;
  customer_id: string;
  customer_name: string;
  date: string;
  type: InteractionType;
  description: string;
  staff_member_id: string;
  staff_member_name: string;
  status: InteractionStatus;
  notes?: string;
  related_work_order_id?: string;
  follow_up_date?: string;
  follow_up_completed?: boolean;
  created_at?: string;
  updated_at?: string;
  vehicle_id?: string;
  
  // Backwards compatibility properties
  customerId?: string;
  customerName?: string;
  staffMemberId?: string;
  staffMemberName?: string;
  relatedWorkOrderId?: string;
  followUpDate?: string;
  followUpCompleted?: boolean;
}

export interface InteractionFilters {
  type?: InteractionType;
  staffMemberId?: string;
  status?: InteractionStatus;
  dateFrom?: Date;
  dateTo?: Date;
}
