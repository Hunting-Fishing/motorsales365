import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportCustomsDocuments(filters?: { orderId?: string; shipmentId?: string; documentType?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_customs_documents')
      .select('*, export_orders(order_number), export_shipments(tracking_number), export_customers(company_name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (filters?.orderId) q = q.eq('order_id', filters.orderId);
    if (filters?.shipmentId) q = q.eq('shipment_id', filters.shipmentId);
    if (filters?.documentType) q = q.eq('document_type', filters.documentType);
    const { data } = await q;
    setDocuments(data || []);
    setLoading(false);
  }, [shopId, filters?.orderId, filters?.shipmentId, filters?.documentType]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_customs_documents').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Document created' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_customs_documents').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Document updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_customs_documents').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Document removed' });
    fetch();
    return true;
  };

  return { documents, loading, fetch, create, update, remove };
}
