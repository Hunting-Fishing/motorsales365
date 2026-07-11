import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportSanctionsScreenings() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [screenings, setScreenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_sanctions_screenings')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setScreenings(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Record<string, any>) => {
    if (!shopId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('export_sanctions_screenings').insert({
      ...values,
      shop_id: shopId,
      created_by: user?.id,
    } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Screening recorded' });
    fetch();
  };

  const update = async (id: string, values: Record<string, any>) => {
    const { error } = await supabase.from('export_sanctions_screenings').update(values as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Screening updated' });
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from('export_sanctions_screenings').delete().eq('id', id);
    toast({ title: 'Screening deleted' });
    fetch();
  };

  return { screenings, loading, fetch, create, update, remove };
}
