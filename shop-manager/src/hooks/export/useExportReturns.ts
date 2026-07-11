import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportReturns() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_returns')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setReturns(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Record<string, any>) => {
    if (!shopId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('export_returns').insert({
      ...values,
      shop_id: shopId,
      created_by: user?.id,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Return/Claim created' });
    fetch();
  };

  const update = async (id: string, values: Record<string, any>) => {
    const { error } = await supabase.from('export_returns').update(values as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Return/Claim updated' });
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('export_returns').delete().eq('id', id);
    toast({ title: 'Return/Claim deleted' });
    fetch();
  };

  return { returns, loading, fetch, create, update, remove };
}
