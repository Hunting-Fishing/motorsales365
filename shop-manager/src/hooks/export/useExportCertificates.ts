import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportCertificates() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('export_certificates')
      .select('*')
      .eq('shop_id', shopId)
      .order('expiry_date', { ascending: true });
    setCertificates(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_certificates').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Certificate added' }); fetch(); return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await (supabase as any).from('export_certificates').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Certificate updated' }); fetch(); return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('export_certificates').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Certificate removed' }); fetch(); return true;
  };

  return { certificates, loading, fetch, create, update, remove };
}
