
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'Banknote' },
  { value: 'check', label: 'Check', icon: 'FileCheck' },
  { value: 'cheque', label: 'Cheque', icon: 'FileCheck' },
  { value: 'credit_card', label: 'Credit Card', icon: 'CreditCard' },
  { value: 'debit_card', label: 'Debit Card', icon: 'CreditCard' },
  { value: 'charge_account', label: 'Charge Account', icon: 'Building' },
  { value: 'bank_transfer', label: 'Bank Transfer / ACH', icon: 'Landmark' },
  { value: 'etransfer', label: 'E-Transfer', icon: 'Smartphone' },
  { value: 'paypal', label: 'PayPal', icon: 'Wallet' },
  { value: 'venmo', label: 'Venmo', icon: 'Wallet' },
  { value: 'apple_pay', label: 'Apple Pay', icon: 'Smartphone' },
  { value: 'zelle', label: 'Zelle', icon: 'Send' },
  { value: 'money_order', label: 'Money Order', icon: 'Receipt' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
] as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[number]['value'];

export function getPaymentMethodLabel(value: string): string {
  const method = PAYMENT_METHODS.find(m => m.value === value);
  return method?.label || value;
}

export function formatPaymentMethodForDisplay(value: string | null | undefined): string {
  if (!value) return 'Not specified';
  return getPaymentMethodLabel(value);
}
