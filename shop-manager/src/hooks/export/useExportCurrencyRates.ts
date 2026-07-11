import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportCurrencyRates() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_currency_rates')
      .select('*')
      .eq('shop_id', shopId)
      .order('effective_date', { ascending: false });
    setRates(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_currency_rates').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Rate added' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_currency_rates').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Rate removed' });
    fetch();
    return true;
  };

  // Get latest rate for a currency pair
  const getRate = (base: string, target: string): number | null => {
    const found = rates.find(r => r.base_currency === base && r.target_currency === target);
    return found ? Number(found.rate) : null;
  };

  const convert = (amount: number, base: string, target: string): number | null => {
    if (base === target) return amount;
    const rate = getRate(base, target);
    return rate ? amount * rate : null;
  };

  return { rates, loading, fetch, create, remove, getRate, convert };
}
