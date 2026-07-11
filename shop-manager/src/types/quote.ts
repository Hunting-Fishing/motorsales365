
export interface Quote {
  id: string;
  quote_number?: string;
  customer_id?: string;
  vehicle_id?: string;
  status: QuoteStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  expiry_date?: string;
  notes?: string;
  terms_conditions?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  approved_at?: string;
  rejected_at?: string;
  converted_at?: string;
  converted_to_work_order_id?: string;
  // UI fields
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  item_type: QuoteItemType;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConversionAudit {
  id: string;
  source_type: 'quote' | 'work_order';
  source_id: string;
  target_type: 'work_order' | 'invoice';
  target_id: string;
  converted_by?: string;
  conversion_notes?: string;
  created_at: string;
}

export const QUOTE_STATUSES = [
  'draft',
  'sent', 
  'approved',
  'rejected',
  'expired',
  'converted'
] as const;

export type QuoteStatus = typeof QUOTE_STATUSES[number];

export const QUOTE_ITEM_TYPES = [
  'service',
  'part',
  'labor'
] as const;

export type QuoteItemType = typeof QUOTE_ITEM_TYPES[number];

export const quoteStatusMap: Record<QuoteStatus, { label: string; classes: string }> = {
  'draft': { label: 'Draft', classes: 'bg-gray-100 text-gray-800' },
  'sent': { label: 'Sent', classes: 'bg-blue-100 text-blue-800' },
  'approved': { label: 'Approved', classes: 'bg-green-100 text-green-800' },
  'rejected': { label: 'Rejected', classes: 'bg-red-100 text-red-800' },
  'expired': { label: 'Expired', classes: 'bg-orange-100 text-orange-800' },
  'converted': { label: 'Converted', classes: 'bg-purple-100 text-purple-800' }
};

export interface QuoteFormValues {
  customer_id: string;
  vehicle_id?: string;
  expiry_date?: string;
  notes?: string;
  terms_conditions?: string;
  items: QuoteItemFormValues[];
}

export interface QuoteItemFormValues {
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  item_type: QuoteItemType;
}
