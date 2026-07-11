import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportContracts(filters?: { customerId?: string; supplierId?: string; status?: string }) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    let q = supabase
      .from('export_contracts')
      .select('*, export_customers(company_name), export_suppliers(company_name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    if (filters?.customerId) q = q.eq('customer_id', filters.customerId);
    if (filters?.supplierId) q = q.eq('supplier_id', filters.supplierId);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data } = await q;
    setContracts(data || []);
    setLoading(false);
  }, [shopId, filters?.customerId, filters?.supplierId, filters?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await supabase.from('export_contracts').insert({ ...form, shop_id: shopId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Contract created' });
    fetch();
    return true;
  };

  const update = async (id: string, form: Record<string, any>) => {
    const { error } = await supabase.from('export_contracts').update(form).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Contract updated' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_contracts').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Contract removed' });
    fetch();
    return true;
  };

  return { contracts, loading, fetch, create, update, remove };
}

export function useExportContractItems(contractId: string | null) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId || !contractId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('export_contract_items')
      .select('*, export_products(name)')
      .eq('shop_id', shopId)
      .eq('contract_id', contractId)
      .order('created_at');
    setItems(data || []);
    setLoading(false);
  }, [shopId, contractId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form: Record<string, any>) => {
    if (!shopId || !contractId) return false;
    const { error } = await supabase.from('export_contract_items').insert({ ...form, shop_id: shopId, contract_id: contractId } as any);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Item added' });
    fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('export_contract_items').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Item removed' });
    fetch();
    return true;
  };

  return { items, loading, fetch, create, remove };
}
