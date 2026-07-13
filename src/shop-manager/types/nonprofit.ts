export interface Program {
  id: string;
  name: string;
  description?: string;
  program_type: 'education' | 'health' | 'environment' | 'community' | 'youth' | 'seniors' | 'other';
  status: 'active' | 'inactive' | 'completed' | 'planned';
  start_date?: string;
  end_date?: string;
  budget_allocated: number;
  budget_spent: number;
  target_participants: number;
  current_participants: number;
  location?: string;
  coordinator_id?: string;
  shop_id: string;
  grant_funded: boolean;
  funding_sources: string[];
  success_metrics: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Volunteer {
  id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  skills: string[];
  availability: Record<string, any>;
  background_check_status: 'pending' | 'approved' | 'rejected' | 'expired';
  background_check_date?: string;
  training_completed: string[];
  volunteer_hours: number;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProgramParticipant {
  id: string;
  program_id: string;
  participant_name: string;
  participant_email?: string;
  participant_phone?: string;
  enrollment_date: string;
  completion_date?: string;
  status: 'enrolled' | 'active' | 'completed' | 'dropped' | 'suspended';
  progress_notes?: string;
  outcome_data: Record<string, any>;
  demographics: Record<string, any>;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VolunteerAssignment {
  id: string;
  volunteer_id: string;
  program_id?: string;
  role: string;
  start_date: string;
  end_date?: string;
  hours_committed: number;
  hours_completed: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  membership_type: 'regular' | 'premium' | 'lifetime' | 'board' | 'honorary';
  membership_status: 'active' | 'inactive' | 'suspended' | 'expired';
  join_date: string;
  renewal_date?: string;
  annual_dues: number;
  dues_paid: boolean;
  committee_memberships: string[];
  volunteer_interests: string[];
  skills: string[];
  notes?: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  amount: number;
  donation_type: 'monetary' | 'in_kind' | 'goods' | 'services';
  payment_method?: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'paypal' | 'other';
  transaction_id?: string;
  program_id?: string;
  designation?: string;
  is_recurring: boolean;
  recurrence_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  tax_deductible: boolean;
  receipt_sent: boolean;
  receipt_number?: string;
  anonymous: boolean;
  notes?: string;
  donation_date: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ImpactMeasurementData {
  id: string;
  metric_id: string;
  measured_value: number;
  measurement_date: string;
  notes?: string;
  verified_by?: string;
  verification_date?: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ImpactMeasurement {
  id: string;
  program_id: string;
  metric_name: string;
  metric_value: number;
  measurement_unit?: string;
  measurement_date: string;
  measurement_period?: string;
  notes?: string;
  verified_by?: string;
  verification_date?: string;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProgramData {
  name: string;
  description?: string;
  program_type: Program['program_type'];
  status?: Program['status'];
  start_date?: string;
  end_date?: string;
  budget_allocated?: number;
  target_participants?: number;
  location?: string;
  coordinator_id?: string;
  grant_funded?: boolean;
  funding_sources?: string[];
  success_metrics?: string[];
}

export interface CreateVolunteerData {
  customer_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  skills?: string[];
  availability?: Record<string, any>;
  background_check_status?: Volunteer['background_check_status'];
  background_check_date?: string;
  training_completed?: string[];
  notes?: string;
}

export interface CreateParticipantData {
  program_id: string;
  participant_name: string;
  participant_email?: string;
  participant_phone?: string;
  enrollment_date?: string;
  status?: ProgramParticipant['status'];
  progress_notes?: string;
  outcome_data?: Record<string, any>;
  demographics?: Record<string, any>;
}

export interface CreateVolunteerAssignmentData {
  volunteer_id: string;
  program_id?: string;
  role: string;
  start_date: string;
  end_date?: string;
  hours_committed?: number;
  notes?: string;
}

export interface CreateMemberData {
  customer_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  membership_type?: Member['membership_type'];
  membership_status?: Member['membership_status'];
  join_date?: string;
  renewal_date?: string;
  annual_dues?: number;
  dues_paid?: boolean;
  committee_memberships?: string[];
  volunteer_interests?: string[];
  skills?: string[];
  notes?: string;
}

export interface CreateDonationData {
  donor_name: string;
  donor_email?: string;
  donor_phone?: string;
  donor_address?: string;
  amount: number;
  donation_type?: Donation['donation_type'];
  payment_method?: Donation['payment_method'];
  transaction_id?: string;
  program_id?: string;
  designation?: string;
  is_recurring?: boolean;
  recurrence_frequency?: Donation['recurrence_frequency'];
  tax_deductible?: boolean;
  receipt_sent?: boolean;
  receipt_number?: string;
  anonymous?: boolean;
  notes?: string;
  donation_date?: string;
}

export interface CreateImpactMeasurementData {
  program_id: string;
  metric_name: string;
  metric_value: number;
  measurement_unit?: string;
  measurement_date?: string;
  measurement_period?: string;
  notes?: string;
  verified_by?: string;
}