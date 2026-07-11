
import { CustomerVehicle } from '@/types/customer';

export interface CustomerEntity {
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
  
  // Optional fields
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
  tags?: string[];
  segments?: string[];
  
  // Business info
  company?: string;
  business_type?: string;
  business_industry?: string;
  other_business_industry?: string;
  tax_id?: string;
  business_email?: string;
  business_phone?: string;
  
  // Payment & Billing
  preferred_payment_method?: string;
  auto_billing?: boolean;
  credit_terms?: string;
  terms_agreed?: boolean;
  
  // Tax Exemption
  labor_tax_exempt?: boolean;
  parts_tax_exempt?: boolean;
  tax_exempt_certificate_number?: string;
  tax_exempt_notes?: string;
  
  // Computed properties
  fullName: string;
  vehicleCount: number;
  vehicles?: CustomerVehicle[];
  
  // Methods
  hasVehicles(): boolean;
  isFleetCustomer(): boolean;
  matchesSearch(searchTerm: string): boolean;
}

export class Customer implements CustomerEntity {
  constructor(
    public readonly id: string,
    public readonly first_name: string,
    public readonly last_name: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly address: string,
    public readonly shop_id: string,
    public readonly created_at: string,
    public readonly updated_at: string,
    public readonly city?: string,
    public readonly state?: string,
    public readonly postal_code?: string,
    public readonly country?: string,
    public readonly preferred_technician_id?: string,
    public readonly communication_preference?: string,
    public readonly referral_source?: string,
    public readonly referral_person_id?: string,
    public readonly other_referral_details?: string,
    public readonly household_id?: string,
    public readonly is_fleet?: boolean,
    public readonly fleet_company?: string,
    public readonly fleet_manager?: string,
    public readonly fleet_contact?: string,
    public readonly preferred_service_type?: string,
    public readonly notes?: string,
    public readonly tags?: string[],
    public readonly segments?: string[],
    public readonly company?: string,
    public readonly business_type?: string,
    public readonly business_industry?: string,
    public readonly other_business_industry?: string,
    public readonly tax_id?: string,
    public readonly business_email?: string,
    public readonly business_phone?: string,
    public readonly preferred_payment_method?: string,
    public readonly auto_billing?: boolean,
    public readonly credit_terms?: string,
    public readonly terms_agreed?: boolean,
    public readonly labor_tax_exempt?: boolean,
    public readonly parts_tax_exempt?: boolean,
    public readonly tax_exempt_certificate_number?: string,
    public readonly tax_exempt_notes?: string,
    public readonly vehicles?: CustomerVehicle[]
  ) {}

  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  get vehicleCount(): number {
    return this.vehicles?.length || 0;
  }

  hasVehicles(): boolean {
    return this.vehicleCount > 0;
  }

  isFleetCustomer(): boolean {
    return this.is_fleet === true;
  }

  matchesSearch(searchTerm: string): boolean {
    const search = searchTerm.toLowerCase();
    return (
      this.fullName.toLowerCase().includes(search) ||
      this.email.toLowerCase().includes(search) ||
      this.phone.toLowerCase().includes(search) ||
      this.company?.toLowerCase().includes(search) ||
      false
    );
  }
}
