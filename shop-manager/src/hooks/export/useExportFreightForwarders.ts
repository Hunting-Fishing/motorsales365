import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportFreightForwarders() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [forwarders, setForwarders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_freight_forwarders')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setForwarders(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Record<string, any>) => {
    if (!shopId) return;
    const { error } = await supabase.from('export_freight_forwarders').insert({
      ...values,
      shop_id: shopId,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Forwarder added' });
    fetch();
  };

  const update = async (id: string, values: Record<string, any>) => {
    const { error } = await supabase.from('export_freight_forwarders').update(values as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Forwarder updated' });
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('export_freight_forwarders').delete().eq('id', id);
    toast({ title: 'Forwarder removed' });
    fetch();
  };

  return { forwarders, loading, fetch, create, update, remove };
}
