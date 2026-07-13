
import { supabase } from '@/integrations/supabase/client';
import { Quote, QuoteItem, ConversionAudit, QuoteStatus, QuoteItemType } from '@/types/quote';

export async function getAllQuotes(): Promise<Quote[]> {
  console.log('getAllQuotes: Starting fetch...');
  
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customers (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      vehicles (
        id,
        year,
        make,
        model
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllQuotes: Error fetching quotes:', error);
    throw new Error(`Failed to fetch quotes: ${error.message}`);
  }

  console.log('getAllQuotes: Raw data from Supabase:', data);

  return data.map(quote => ({
    ...quote,
    status: quote.status as QuoteStatus,
    customer_name: quote.customers 
      ? `${quote.customers.first_name || ''} ${quote.customers.last_name || ''}`.trim()
      : '',
    customer_email: quote.customers?.email || '',
    customer_phone: quote.customers?.phone || '',
    vehicle_year: quote.vehicles?.year ? String(quote.vehicles.year) : '',
    vehicle_make: quote.vehicles?.make || '',
    vehicle_model: quote.vehicles?.model || ''
  })) as Quote[];
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  console.log('getQuoteById: Fetching quote:', id);
  
  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      customers (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      vehicles (
        id,
        year,
        make,
        model
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('getQuoteById: Error fetching quote:', error);
    throw new Error(`Failed to fetch quote: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    status: data.status as QuoteStatus,
    customer_name: data.customers 
      ? `${data.customers.first_name || ''} ${data.customers.last_name || ''}`.trim()
      : '',
    customer_email: data.customers?.email || '',
    customer_phone: data.customers?.phone || '',
    vehicle_year: data.vehicles?.year ? String(data.vehicles.year) : '',
    vehicle_make: data.vehicles?.make || '',
    vehicle_model: data.vehicles?.model || ''
  } as Quote;
}

export async function getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
  console.log('getQuoteItems: Fetching items for quote:', quoteId);
  
  const { data, error } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', quoteId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('getQuoteItems: Error fetching quote items:', error);
    throw new Error(`Failed to fetch quote items: ${error.message}`);
  }

  return data.map(item => ({
    ...item,
    item_type: item.item_type as QuoteItemType
  })) as QuoteItem[];
}

export async function createQuote(quote: Partial<Quote>): Promise<Quote> {
  console.log('createQuote: Creating quote:', quote);
  
  const { data, error } = await supabase
    .from('quotes')
    .insert([{
      customer_id: quote.customer_id,
      vehicle_id: quote.vehicle_id,
      status: quote.status || 'draft',
      subtotal: quote.subtotal || 0,
      tax_rate: quote.tax_rate || 0, // Let tax calculations handle this
      tax_amount: quote.tax_amount || 0,
      total_amount: quote.total_amount || 0,
      expiry_date: quote.expiry_date,
      notes: quote.notes,
      terms_conditions: quote.terms_conditions
    }])
    .select()
    .single();

  if (error) {
    console.error('createQuote: Error creating quote:', error);
    throw new Error(`Failed to create quote: ${error.message}`);
  }

  return data as Quote;
}

export async function updateQuote(id: string, updates: Partial<Quote>): Promise<Quote> {
  console.log('updateQuote: Updating quote:', id, updates);
  
  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateQuote: Error updating quote:', error);
    throw new Error(`Failed to update quote: ${error.message}`);
  }

  return data as Quote;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<Quote> {
  console.log('updateQuoteStatus: Updating quote status:', id, status);
  
  const updates: any = { status };
  
  // Add timestamp fields based on status
  switch (status) {
    case 'sent':
      updates.sent_at = new Date().toISOString();
      break;
    case 'approved':
      updates.approved_at = new Date().toISOString();
      break;
    case 'rejected':
      updates.rejected_at = new Date().toISOString();
      break;
  }

  return updateQuote(id, updates);
}

export async function deleteQuote(id: string): Promise<void> {
  console.log('deleteQuote: Deleting quote:', id);
  
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteQuote: Error deleting quote:', error);
    throw new Error(`Failed to delete quote: ${error.message}`);
  }
}

export async function convertQuoteToWorkOrder(quoteId: string, notes?: string): Promise<string> {
  console.log('convertQuoteToWorkOrder: Converting quote to work order:', quoteId);
  
  // Ensure we have the current user id for auditing and RLS
  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error('convertQuoteToWorkOrder: Auth error:', userErr);
    throw new Error('User not authenticated');
  }
  const userId = userResp?.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase.rpc('convert_quote_to_work_order', {
    p_quote_id: quoteId,
    p_converted_by: userId,
    p_notes: notes || null
  });

  if (error) {
    console.error('convertQuoteToWorkOrder: Error converting quote:', error);
    throw new Error(`Failed to convert quote to work order: ${error.message}`);
  }

  console.log('convertQuoteToWorkOrder: Successfully converted. New work order ID:', data);
  return data;
}

export async function convertWorkOrderToInvoice(workOrderId: string, notes?: string): Promise<string> {
  console.log('convertWorkOrderToInvoice: Converting work order to invoice:', workOrderId);
  
  // Ensure we have the current user id for auditing and RLS
  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    console.error('convertWorkOrderToInvoice: Auth error:', userErr);
    throw new Error('User not authenticated');
  }
  const userId = userResp?.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('convert_work_order_to_invoice', {
    p_work_order_id: workOrderId,
    p_converted_by: userId,
    p_notes: notes || null
  });

  if (error) {
    console.error('convertWorkOrderToInvoice: Error converting work order:', error);
    throw new Error(`Failed to convert work order to invoice: ${error.message}`);
  }

  console.log('convertWorkOrderToInvoice: Successfully converted. New invoice ID:', data);
  return data;
}

export async function getConversionAudit(sourceId: string, sourceType: 'quote' | 'work_order'): Promise<ConversionAudit[]> {
  console.log('getConversionAudit: Fetching conversion audit:', sourceId, sourceType);
  
  const { data, error } = await supabase
    .from('conversion_audit')
    .select('*')
    .eq('source_id', sourceId)
    .eq('source_type', sourceType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getConversionAudit: Error fetching conversion audit:', error);
    throw new Error(`Failed to fetch conversion audit: ${error.message}`);
  }

  return data.map(audit => ({
    ...audit,
    source_type: audit.source_type as 'quote' | 'work_order',
    target_type: audit.target_type as 'work_order' | 'invoice'
  })) as ConversionAudit[];
}
