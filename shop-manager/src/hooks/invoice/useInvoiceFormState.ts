
import { useState } from 'react';
import { Invoice } from '@/types/invoice';

export function useInvoiceFormState(initialInvoice?: Partial<Invoice>) {
  const [invoice, setInvoice] = useState<Invoice>(() => ({
    id: initialInvoice?.id || '',
    number: initialInvoice?.number || '',
    customer: initialInvoice?.customer || '',
    customer_id: initialInvoice?.customer_id || '',
    customer_email: initialInvoice?.customer_email || '',
    customer_address: initialInvoice?.customer_address || '',
    date: initialInvoice?.date || new Date().toISOString().split('T')[0],
    status: initialInvoice?.status || 'draft',
    issue_date: initialInvoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: initialInvoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    subtotal: initialInvoice?.subtotal || 0,
    tax_rate: initialInvoice?.tax_rate || 0.08, // Will be updated with company tax settings
    tax: initialInvoice?.tax || 0,
    total: initialInvoice?.total || 0,
    notes: initialInvoice?.notes || '',
    description: initialInvoice?.description || '',
    payment_method: initialInvoice?.payment_method || '',
    work_order_id: initialInvoice?.work_order_id || '',
    assignedStaff: initialInvoice?.assignedStaff || [],
    items: initialInvoice?.items || [],
    created_at: initialInvoice?.created_at || new Date().toISOString(),
    created_by: initialInvoice?.created_by || '',
    updated_at: initialInvoice?.updated_at
  }));

  const updateInvoice = (updates: Partial<Invoice>) => {
    setInvoice(prev => ({
      ...prev,
      ...updates
    }));
  };

  return {
    invoice,
    setInvoice,
    updateInvoice
  };
}
