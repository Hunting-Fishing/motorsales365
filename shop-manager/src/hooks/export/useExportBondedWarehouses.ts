import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportBondedWarehouses() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_bonded_warehouses').select('*').eq('shop_id', shopId).order('warehouse_name');
    setWarehouses(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_bonded_warehouses').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Bonded warehouse added' }); fetch(); return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await (supabase as any).from('export_bonded_warehouses').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Warehouse updated' }); fetch(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('export_bonded_warehouses').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Warehouse removed' }); fetch(); return true;
  };

  return { warehouses, loading, fetch, create, update, remove };
}
