import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportCountryRequirements() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('export_country_requirements')
      .select('*')
      .eq('shop_id', shopId)
      .order('country_name');
    setRequirements(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_country_requirements').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Country requirements added' }); fetch(); return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await (supabase as any).from('export_country_requirements').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Requirements updated' }); fetch(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('export_country_requirements').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Requirements removed' }); fetch(); return true;
  };

  return { requirements, loading, fetch, create, update, remove };
}
