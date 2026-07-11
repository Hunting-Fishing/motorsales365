import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types/invoice';

export interface InvoiceDetails extends Omit<Invoice, 'customer'> {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  invoice_number?: string;
  total_amount?: number;
  paid_amount?: number;
  tax_amount?: number;
  workOrder?: {
    id: string;
    description: string;
    technician: string;
    completedAt: string;
  };
  items: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    total: number;
    type?: 'labor' | 'parts' | 'service';
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    date: string;
    reference?: string;
  }>;
}

export async function getInvoiceDetails(id: string): Promise<InvoiceDetails | null> {
  try {
    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) return null;

    // Get customer details
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone, address')
      .eq('id', invoice.customer_id)
      .single();

    // Get work order details if linked
    let workOrder = null;
    if (invoice.work_order_id) {
      const { data: wo } = await supabase
        .from('work_orders')
        .select(`
          id,
          description,
          technician_id,
          updated_at,
          profiles!work_orders_technician_id_fkey(first_name, last_name)
        `)
        .eq('id', invoice.work_order_id)
        .single();

      if (wo) {
        workOrder = {
          id: wo.id,
          description: wo.description || '',
          technician: wo.profiles ? `${(wo.profiles as any).first_name} ${(wo.profiles as any).last_name}` : 'Unknown',
          completedAt: wo.updated_at
        };
      }
    }

    // Get invoice items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at');

    // Payments are empty for now
    const payments: any[] = [];

    return {
      ...invoice,
      customer: {
        id: customer?.id || '',
        name: customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || ''
      },
      workOrder,
      items: items?.map(item => ({
        id: item.id,
        name: item.name || item.description || 'Item',
        description: item.description || '',
        quantity: item.quantity || 1,
        price: item.price || 0,
        total: (item.quantity || 1) * (item.price || 0),
        type: 'service' as any
      })) || [],
      payments: []
    } as InvoiceDetails;
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return null;
  }
}

export async function addPayment(invoiceId: string, payment: {
  amount: number;
  method: string;
  reference?: string;
}): Promise<boolean> {
  try {
    // Skip payment insertion as table doesn't exist
    // Just update invoice status based on amount
    const { data: currentInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (currentInvoice) {
      const newPaidAmount = ((currentInvoice as any).paid_amount || 0) + payment.amount;
      const status = newPaidAmount >= ((currentInvoice as any).total || (currentInvoice as any).total_amount || 0) ? 'paid' : 'partial';

      await supabase
        .from('invoices')
        .update({ 
          paid_amount: newPaidAmount as any,
          status: status as any,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', invoiceId);
    }

    return true;
  } catch (error) {
    console.error('Error adding payment:', error);
    return false;
  }
}