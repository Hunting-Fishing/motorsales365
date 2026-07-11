import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useImportReceiving(filters?: { poId?: string; warehouseId?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('import_receiving')
      .select('*, import_purchase_orders(po_number), export_products(name), export_warehouses(name)')
      .eq('shop_id', shopId)
      .order('received_date', { ascending: false });
    if (filters?.poId) q = q.eq('purchase_order_id', filters.poId);
    if (filters?.warehouseId) q = q.eq('warehouse_id', filters.warehouseId);
    const { data } = await q;
    setRecords(data || []);
    setLoading(false);
  }, [shopId, filters?.poId, filters?.warehouseId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('import_receiving').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Receiving logged' });
    fetch();
    return true;
  };

  return { records, loading, fetch, create };
}
