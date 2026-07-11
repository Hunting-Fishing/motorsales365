import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportClients() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_customers')
      .select('*')
      .eq('shop_id', shopId)
      .order('company_name');
    setClients(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_customers').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Client added' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_customers').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Client updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_customers').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Client removed' });
    fetch();
    return true;
  };

  return { clients, loading, fetch, create, update, remove };
}

export function useExportClientContacts(customerId: string | null) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId || !customerId) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('export_client_contacts')
      .select('*')
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .order('is_primary', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, [shopId, customerId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId || !customerId) return false;
    const { error } = await supabase.from('export_client_contacts').insert({ ...form, shop_id: shopId, customer_id: customerId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Contact added' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_client_contacts').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Contact removed' });
    fetch();
    return true;
  };

  return { contacts, loading, fetch, create, remove };
}
