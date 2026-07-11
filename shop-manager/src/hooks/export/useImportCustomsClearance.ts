import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useImportCustomsClearance(filters?: { poId?: string; status?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [clearances, setClearances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('import_customs_clearance')
      .select('*, import_purchase_orders(po_number)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (filters?.poId) q = q.eq('purchase_order_id', filters.poId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setClearances(data || []);
    setLoading(false);
  }, [shopId, filters?.poId, filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('import_customs_clearance').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Clearance record created' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('import_customs_clearance').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Clearance updated' });
    fetch();
    return true;
  };

  return { clearances, loading, fetch, create, update };
}
