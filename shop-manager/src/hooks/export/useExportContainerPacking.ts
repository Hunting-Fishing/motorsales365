import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportContainerPacking(filters?: { shipmentId?: string; orderId?: string; containerNumber?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [packingItems, setPackingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_container_packing')
      .select('*, export_products(name), export_product_variants(variant_name, sku), export_shipments(tracking_number)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (filters?.shipmentId) q = q.eq('shipment_id', filters.shipmentId);
    if (filters?.orderId) q = q.eq('order_id', filters.orderId);
    if (filters?.containerNumber) q = q.eq('container_number', filters.containerNumber);
    const { data } = await q;
    setPackingItems(data || []);
    setLoading(false);
  }, [shopId, filters?.shipmentId, filters?.orderId, filters?.containerNumber]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_container_packing').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Packing item added' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_container_packing').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Packing updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_container_packing').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Packing item removed' });
    fetch();
    return true;
  };

  return { packingItems, loading, fetch, create, update, remove };
}
