
export interface InventoryVendor {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  notes?: string;
}

// Data transfer object for creating new vendors
export interface CreateInventoryVendorDto {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  is_active?: boolean;
  notes?: string;
}
