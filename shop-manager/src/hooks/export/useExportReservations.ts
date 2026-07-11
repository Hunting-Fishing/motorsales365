import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportReservations(filters?: { requestId?: string; orderId?: string; inventoryId?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_inventory_reservations')
      .select('*, export_inventory(*, export_products(name)), export_customers(company_name), export_requests(request_number)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (filters?.requestId) q = q.eq('request_id', filters.requestId);
    if (filters?.orderId) q = q.eq('order_id', filters.orderId);
    if (filters?.inventoryId) q = q.eq('inventory_id', filters.inventoryId);
    const { data } = await q;
    setReservations(data || []);
    setLoading(false);
  }, [shopId, filters?.requestId, filters?.orderId, filters?.inventoryId]);

  useEffect(() => { fetch(); }, [fetch]);

  const reserve = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_inventory_reservations').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Stock reserved' });
    fetch();
    return true;
  };

  const release = async (id: string) => {
    const { error } = await supabase.from('export_inventory_reservations').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Reservation released' });
    fetch();
    return true;
  };

  return { reservations, loading, fetch, reserve, release };
}
