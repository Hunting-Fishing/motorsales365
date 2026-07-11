
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/invoice';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Only fetch real invoices from database - no mock data
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform database data to match Invoice interface
      const transformedInvoices: Invoice[] = (data || []).map((dbInvoice: any) => ({
        id: dbInvoice.id,
        number: dbInvoice.id, // Use ID as invoice number since number field doesn't exist in DB
        customer_id: dbInvoice.customer_id || '',
        customer: dbInvoice.customer || '',
        customer_email: dbInvoice.customer_email || '',
        customer_address: dbInvoice.customer_address || '',
        date: dbInvoice.date,
        due_date: dbInvoice.due_date,
        issue_date: dbInvoice.date, // Use date as issue_date since it doesn't exist in DB
        status: dbInvoice.status as 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled',
        subtotal: dbInvoice.subtotal || 0,
        tax: dbInvoice.tax || 0,
        tax_rate: 0.08, // Default fallback - should be updated with company tax settings
        total: dbInvoice.total || 0,
        created_at: dbInvoice.created_at,
        updated_at: dbInvoice.updated_at,
        items: [], // Default empty array since invoice items are stored separately
        notes: dbInvoice.notes,
        description: dbInvoice.description,
        payment_method: dbInvoice.payment_method,
        work_order_id: dbInvoice.work_order_id,
        assignedStaff: [], // Default empty array since this doesn't exist in DB
        created_by: dbInvoice.created_by || '',
        last_updated_by: dbInvoice.created_by,
        last_updated_at: dbInvoice.updated_at
      }));

      setInvoices(transformedInvoices);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
      setInvoices([]); // No fallback to mock data
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchInvoices();
  };

  return {
    invoices,
    isLoading,
    error,
    refetch
  };
}
