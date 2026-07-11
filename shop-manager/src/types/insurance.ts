// Insurance Policy Types

export type InsuranceType = 
  | 'comprehensive'
  | 'liability'
  | 'collision'
  | 'hull'
  | 'cargo'
  | 'workers_comp'
  | 'property'
  | 'umbrella';

export type InsuranceStatus = 'active' | 'expired' | 'cancelled' | 'pending_renewal';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export type TitleStatus = 'owned' | 'financed' | 'leased';

export interface InsurancePolicy {
  id: string;
  shop_id: string;
  equipment_id?: string;
  vehicle_id?: string;
  
  // Policy Information
  policy_number: string;
  insurance_provider: string;
  insurance_type: InsuranceType;
  coverage_description?: string;
  coverage_amount?: number;
  deductible?: number;
  
  // Cost & Dates
  premium_amount: number;
  payment_frequency: PaymentFrequency;
  effective_date: string;
  expiration_date: string;
  renewal_reminder_days: number;
  
  // Status
  status: InsuranceStatus;
  auto_renew: boolean;
  
  // Contact & Documents
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  policy_document_url?: string;
  
  // Audit
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  equipment?: {
    id: string;
    name: string;
    equipment_type?: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
  };
}

export interface InsuranceStats {
  totalPolicies: number;
  activePolicies: number;
  expiredPolicies: number;
  pendingRenewals: number;
  totalPremiums: number;
  totalCoverage: number;
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
}

export interface InsurancePremiumTrend {
  month: string;
  premium: number;
  count: number;
}

export interface InsuranceByType {
  type: InsuranceType;
  count: number;
  totalPremium: number;
}

export interface InsuranceFormData {
  equipment_id?: string;
  vehicle_id?: string;
  policy_number: string;
  insurance_provider: string;
  insurance_type: InsuranceType;
  coverage_description?: string;
  coverage_amount?: string;
  deductible?: string;
  premium_amount: string;
  payment_frequency: PaymentFrequency;
  effective_date: string;
  expiration_date: string;
  renewal_reminder_days: string;
  auto_renew: boolean;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  notes?: string;
}

export const INSURANCE_TYPES: { value: InsuranceType; label: string }[] = [
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'liability', label: 'Liability' },
  { value: 'collision', label: 'Collision' },
  { value: 'hull', label: 'Hull (Marine)' },
  { value: 'cargo', label: 'Cargo' },
  { value: 'workers_comp', label: 'Workers Compensation' },
  { value: 'property', label: 'Property' },
  { value: 'umbrella', label: 'Umbrella' },
];

export const PAYMENT_FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi-annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];
