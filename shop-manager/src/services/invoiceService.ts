
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';

// Transform database invoice to our Invoice type
const transformDatabaseInvoice = (dbInvoice: any): Invoice => ({
  id: dbInvoice.id,
  number: dbInvoice.id, // Use ID as number since number field doesn't exist
  customer_id: dbInvoice.customer_id || '',
  customer: dbInvoice.customer,
  customer_email: dbInvoice.customer_email || '',
  customer_address: dbInvoice.customer_address || '',
  date: dbInvoice.date,
  due_date: dbInvoice.due_date,
  issue_date: dbInvoice.date, // Use date as issue_date since issue_date doesn't exist
  status: dbInvoice.status as 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled',
  subtotal: dbInvoice.subtotal || 0,
  tax: dbInvoice.tax || 0,
  tax_rate: 0.08, // Default fallback - should be updated with company tax settings
  total: dbInvoice.total || 0,
  created_at: dbInvoice.created_at,
  updated_at: dbInvoice.updated_at,
  items: [], // Will be populated separately
  notes: dbInvoice.notes,
  description: dbInvoice.description,
  payment_method: dbInvoice.payment_method,
  work_order_id: dbInvoice.work_order_id,
  assignedStaff: [], // Default empty array since this doesn't exist in DB
  created_by: dbInvoice.created_by || '',
  last_updated_by: dbInvoice.created_by,
  last_updated_at: dbInvoice.updated_at
});

export const invoiceService = {
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    return (data || []).map(transformDatabaseInvoice);
  },

  async getInvoice(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }

    return transformDatabaseInvoice(data);
  },

  async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'number' | 'issue_date' | 'tax_rate' | 'items' | 'assignedStaff' | 'last_updated_by' | 'last_updated_at'>): Promise<Invoice> {
    // Only include fields that exist in the database schema
    const dbInvoice: any = {
      customer: invoice.customer || '',
      date: invoice.date,
      due_date: invoice.due_date,
      status: invoice.status,
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      total: invoice.total || 0,
      customer_id: invoice.customer_id || '',
      customer_email: invoice.customer_email || '',
      customer_address: invoice.customer_address || '',
      notes: invoice.notes || null,
      payment_method: invoice.payment_method || null,
      work_order_id: invoice.work_order_id || null,
      description: invoice.description || null,
      created_by: invoice.created_by || ''
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert(dbInvoice)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }

    return transformDatabaseInvoice(data);
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    // Only include valid database fields in the update
    const validUpdates: Record<string, any> = {};
    
    if (updates.customer !== undefined) validUpdates.customer = updates.customer;
    if (updates.date !== undefined) validUpdates.date = updates.date;
    if (updates.due_date !== undefined) validUpdates.due_date = updates.due_date;
    if (updates.status !== undefined) validUpdates.status = updates.status;
    if (updates.subtotal !== undefined) validUpdates.subtotal = updates.subtotal;
    if (updates.tax !== undefined) validUpdates.tax = updates.tax;
    if (updates.total !== undefined) validUpdates.total = updates.total;
    if (updates.customer_id !== undefined) validUpdates.customer_id = updates.customer_id;
    if (updates.customer_email !== undefined) validUpdates.customer_email = updates.customer_email;
    if (updates.customer_address !== undefined) validUpdates.customer_address = updates.customer_address;
    if (updates.notes !== undefined) validUpdates.notes = updates.notes;
    if (updates.payment_method !== undefined) validUpdates.payment_method = updates.payment_method;
    if (updates.work_order_id !== undefined) validUpdates.work_order_id = updates.work_order_id;
    if (updates.description !== undefined) validUpdates.description = updates.description;

    const { data, error } = await supabase
      .from('invoices')
      .update(validUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update invoice: ${error.message}`);
    }

    return transformDatabaseInvoice(data);
  },

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }
};

// Export individual functions for backwards compatibility
export const getInvoices = invoiceService.getInvoices;
export const getInvoice = invoiceService.getInvoice;
export const getInvoiceById = invoiceService.getInvoice; // Alias for backwards compatibility
export const createInvoice = invoiceService.createInvoice;
export const updateInvoice = invoiceService.updateInvoice;
export const deleteInvoice = invoiceService.deleteInvoice;
