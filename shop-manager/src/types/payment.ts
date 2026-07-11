
export type PaymentType = "full" | "partial" | "deposit" | "refund";
export type PaymentStatus = "pending" | "processed" | "failed" | "refunded";
export type PaymentMethodType = "credit_card" | "debit_card" | "bank_transfer" | "cash" | "check" | "other";

export interface PaymentMethod {
  id: string;
  customer_id: string;
  method_type: PaymentMethodType;
  is_default: boolean;
  card_brand?: string;
  card_last_four?: string;
  expiry_month?: number;
  expiry_year?: number;
  billing_name?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  invoice_id?: string;
  amount: number;
  payment_type: PaymentType;
  status: PaymentStatus;
  payment_method_id?: string;
  transaction_id?: string;
  transaction_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentFormValues {
  amount: number;
  payment_method_id?: string;
  payment_type: PaymentType;
  status: PaymentStatus;
  transaction_id?: string;
  transaction_date?: string;
  notes?: string;
}

export const paymentTypeOptions = [
  { label: 'Full Payment', value: 'full' },
  { label: 'Partial Payment', value: 'partial' },
  { label: 'Deposit', value: 'deposit' },
  { label: 'Refund', value: 'refund' },
];

export const paymentStatusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Processed', value: 'processed' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

export const paymentMethodOptions = [
  { label: 'Credit Card', value: 'credit_card' },
  { label: 'Debit Card', value: 'debit_card' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'Check', value: 'check' },
  { label: 'Other', value: 'other' },
];
