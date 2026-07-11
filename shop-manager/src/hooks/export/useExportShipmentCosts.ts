import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportShipmentCosts() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_shipment_costs').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
    setCosts(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_shipment_costs').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Shipment cost record added' }); fetch(); return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await (supabase as any).from('export_shipment_costs').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Cost record updated' }); fetch(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('export_shipment_costs').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Cost record removed' }); fetch(); return true;
  };

  return { costs, loading, fetch, create, update, remove };
}
