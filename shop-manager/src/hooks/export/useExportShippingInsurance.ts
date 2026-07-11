import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportShippingInsurance(filters?: { shipmentId?: string; status?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_shipping_insurance')
      .select('*, export_shipments(shipment_number), export_orders(order_number)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (filters?.shipmentId) q = q.eq('shipment_id', filters.shipmentId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setPolicies(data || []);
    setLoading(false);
  }, [shopId, filters?.shipmentId, filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_shipping_insurance').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Insurance policy added' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_shipping_insurance').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Policy updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_shipping_insurance').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Policy removed' });
    fetch();
    return true;
  };

  return { policies, loading, fetch, create, update, remove };
}
