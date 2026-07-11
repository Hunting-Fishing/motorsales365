
export interface Invoice {
  id: string;
  customer: string;
  customer_email: string;
  customer_address: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  notes?: string;
  description?: string;
  payment_method?: string;
  work_order_id?: string;
  assignedStaff: StaffMember[];
  created_by: string;
  last_updated_by?: string;
  last_updated_at?: string;
  customer_id?: string;
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
  invoice_template_items: InvoiceItem[];
}

// Helper function to create an invoice updater
export const createInvoiceUpdater = (updates: Partial<Invoice>) => {
  return (prev: Invoice) => ({
    ...prev,
    ...updates
  });
};

// Re-export the StaffMember type
export { StaffMember };
