import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportRequests() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_requests')
      .select('*, export_customers(company_name, country)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return null;
    const { data, error } = await supabase.from('export_requests').insert({ ...form, shop_id: shopId } as any).select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return null; }
    toast({ title: 'Request created' });
    fetch();
    return data;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_requests').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Request updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_requests').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Request removed' });
    fetch();
    return true;
  };

  return { requests, loading, fetch, create, update, remove };
}

export function useExportRequestItems(requestId: string | null) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId || !requestId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('export_request_items')
      .select('*, export_products(name, category), export_product_variants(variant_name, sku)')
      .eq('request_id', requestId)
      .order('created_at');
    setItems(data || []);
    setLoading(false);
  }, [shopId, requestId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId || !requestId) return false;
    const { error } = await supabase.from('export_request_items').insert({ ...form, shop_id: shopId, request_id: requestId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Item added' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_request_items').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Item removed' });
    fetch();
    return true;
  };

  return { items, loading, fetch, create, remove };
}
