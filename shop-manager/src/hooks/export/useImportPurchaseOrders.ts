import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useImportPurchaseOrders(filters?: { supplierId?: string; status?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('import_purchase_orders')
      .select('*, export_suppliers(company_name)')
      .eq('shop_id', shopId)
      .order('order_date', { ascending: false });
    if (filters?.supplierId) q = q.eq('supplier_id', filters.supplierId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  }, [shopId, filters?.supplierId, filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('import_purchase_orders').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Purchase order created' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('import_purchase_orders').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Purchase order updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('import_purchase_orders').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Purchase order removed' });
    fetch();
    return true;
  };

  return { orders, loading, fetch, create, update, remove };
}

export function useImportPOItems(poId: string | null) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId || !poId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('import_purchase_order_items')
      .select('*, export_products(name)')
      .eq('shop_id', shopId)
      .eq('purchase_order_id', poId)
      .order('created_at');
    setItems(data || []);
    setLoading(false);
  }, [shopId, poId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId || !poId) return false;
    const { error } = await supabase.from('import_purchase_order_items').insert({ ...form, shop_id: shopId, purchase_order_id: poId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Item added' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('import_purchase_order_items').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Item removed' });
    fetch();
    return true;
  };

  return { items, loading, fetch, create, remove };
}
