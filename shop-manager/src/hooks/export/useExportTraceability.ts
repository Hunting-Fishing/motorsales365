import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportTraceability(filters?: { productId?: string; lotNumber?: string; barcode?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_traceability_log')
      .select('*, export_products(name), export_customers(company_name), export_warehouses(name)')
      .eq('shop_id', shopId)
      .order('event_at', { ascending: false })
      .limit(200);
    if (filters?.productId) q = q.eq('product_id', filters.productId);
    if (filters?.lotNumber) q = q.eq('lot_number', filters.lotNumber);
    if (filters?.barcode) q = q.eq('barcode', filters.barcode);
    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  }, [shopId, filters?.productId, filters?.lotNumber, filters?.barcode]);

  useEffect(() => { fetch(); }, [fetch]);

  const logEvent = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_traceability_log').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    fetch();
    return true;
  };

  return { logs, loading, fetch, logEvent };
}
