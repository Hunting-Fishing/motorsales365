
// Base customer types - no sample data
export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  shop_id: string;
  created_at: string;
  updated_at: string;
  
  preferred_technician_id?: string;
  communication_preference?: string;
  referral_source?: string;
  referral_person_id?: string;
  other_referral_details?: string;
  household_id?: string;
  is_fleet?: boolean;
  fleet_company?: string;
  fleet_manager?: string;
  fleet_contact?: string;
  preferred_service_type?: string;
  notes?: string;
  tags?: string[] | any; // Will be normalized in adaptCustomerForUI
  
  segments?: string[] | any; // Will be normalized in adaptCustomerForUI
  
  loyalty?: CustomerLoyalty;
  
  company?: string;
  status?: string;
  lastServiceDate?: string;
  name?: string;
  dateAdded?: string;
  
  preferred_technician_history?: PreferredTechnicianChange[];
  
  vehicles?: CustomerVehicle[];
  
  // Business info fields
  business_type?: string;
  business_industry?: string;
  other_business_industry?: string;
  tax_id?: string;
  business_email?: string;
  business_phone?: string;
  
  // Payment & Billing fields
  preferred_payment_method?: string;
  auto_billing?: boolean;
  credit_terms?: string;
  terms_agreed?: boolean;
  
  // Tax Exemption fields
  labor_tax_exempt?: boolean;
  parts_tax_exempt?: boolean;
  tax_exempt_certificate_number?: string;
  tax_exempt_notes?: string;
  
  // Role field for distinguishing customers from employees/staff
  role?: string;
}

export interface PreferredTechnicianChange {
  id: string;
  customer_id: string;
  previous_technician_id?: string;
  previous_technician_name?: string;
  new_technician_id?: string;
  new_technician_name?: string;
  change_date: string;
  change_reason?: string;
  changed_by_id: string;
  changed_by_name: string;
}

export type CustomerCreate = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

// Import from other module types to avoid circular dependencies
import { CustomerLoyalty } from '@/types/loyalty';
import { CustomerVehicle } from './vehicle';
