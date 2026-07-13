
// Note and communication type definitions
export interface CustomerNote {
  id: string;
  customer_id: string;
  content: string;
  category: 'service' | 'sales' | 'follow-up' | 'general';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerCommunication {
  id: string;
  customer_id: string;
  date: string;
  type: 'email' | 'phone' | 'text' | 'in-person';
  direction: 'incoming' | 'outgoing';
  subject?: string;
  content: string;
  staff_member_id: string;
  staff_member_name: string;
  status: 'completed' | 'pending' | 'failed';
  template_id?: string;
  template_name?: string;
}
