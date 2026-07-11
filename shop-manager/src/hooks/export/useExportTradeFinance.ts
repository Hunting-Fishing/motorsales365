import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportTradeFinance() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_trade_finance_snapshots').select('*').eq('shop_id', shopId).order('snapshot_date', { ascending: false });
    setSnapshots(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_trade_finance_snapshots').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Snapshot saved' }); fetch(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('export_trade_finance_snapshots').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Snapshot removed' }); fetch(); return true;
  };

  return { snapshots, loading, fetch, create, remove };
}
