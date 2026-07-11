import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useImportInvoices(filters?: { supplierId?: string; status?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('import_invoices')
      .select('*, export_suppliers(company_name), import_purchase_orders(po_number)')
      .eq('shop_id', shopId)
      .order('invoice_date', { ascending: false });
    if (filters?.supplierId) q = q.eq('supplier_id', filters.supplierId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setInvoices(data || []);
    setLoading(false);
  }, [shopId, filters?.supplierId, filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('import_invoices').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Invoice recorded' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('import_invoices').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Invoice updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('import_invoices').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Invoice removed' });
    fetch();
    return true;
  };

  return { invoices, loading, fetch, create, update, remove };
}
