
export interface Invoice {
  id: string;
  number: string;
  customer_id: string;
  customer: string;
  customer_email: string;
  customer_address: string;
  date: string;
  due_date: string;
  issue_date: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
  created_at: string;
  updated_at?: string;
  items: InvoiceItem[];
  notes?: string;
  description?: string;
  payment_method?: string;
  work_order_id?: string;
  assignedStaff: StaffMember[];
  created_by: string;
  last_updated_by?: string;
  last_updated_at?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  total: number;
  hours?: boolean;
  sku?: string;
  category?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role?: string;
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  created_at: string;
  last_used: string | null;
  usage_count: number;
  default_tax_rate: number;
  default_due_date_days: number;
  default_notes: string;
  default_items: InvoiceItem[];
}

export interface InvoiceFilters {
  status: string;
  dateRange: string;
  search: string;
  customer?: string;
}

export interface InvoiceFiltersProps {
  filters: InvoiceFilters;
  onFilterChange: (filters: InvoiceFilters) => void;
  onApplyFilters?: (filters: any) => void;
  setFilters?: (filters: InvoiceFilters) => void;
  resetFilters?: () => void;
}

export interface InvoiceFiltersDropdownProps {
  filters: InvoiceFilters;
  onFilterChange: (filters: InvoiceFilters) => void;
  onResetFilters?: () => void;
  onApplyFilters?: (filters: any) => void;
}

// Helper function to create an invoice updater
export const createInvoiceUpdater = (updates: Partial<Invoice>) => {
  return (prev: Invoice) => ({
    ...prev,
    ...updates
  });
};

// Re-export the StaffMember type
export type { StaffMember as InvoiceStaffMember };
