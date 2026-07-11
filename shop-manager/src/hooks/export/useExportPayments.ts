import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportPayments(filters?: { invoiceId?: string; customerId?: string; status?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_payments')
      .select('*, export_invoices(invoice_number, total_amount), export_customers(company_name), export_orders(order_number)')
      .eq('shop_id', shopId)
      .order('payment_date', { ascending: false });
    if (filters?.invoiceId) q = q.eq('invoice_id', filters.invoiceId);
    if (filters?.customerId) q = q.eq('customer_id', filters.customerId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setPayments(data || []);
    setLoading(false);
  }, [shopId, filters?.invoiceId, filters?.customerId, filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_payments').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Payment recorded' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_payments').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Payment updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_payments').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Payment removed' });
    fetch();
    return true;
  };

  return { payments, loading, fetch, create, update, remove };
}
