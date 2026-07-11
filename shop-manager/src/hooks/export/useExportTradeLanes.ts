import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportTradeLanes() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [lanes, setLanes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_trade_lanes').select('*').eq('shop_id', shopId).order('total_revenue', { ascending: false });
    setLanes(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_trade_lanes').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Trade lane added' }); fetch(); return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await (supabase as any).from('export_trade_lanes').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Trade lane updated' }); fetch(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('export_trade_lanes').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Trade lane removed' }); fetch(); return true;
  };

  return { lanes, loading, fetch, create, update, remove };
}
