import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportModuleSettings() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_module_settings').select('*').eq('shop_id', shopId).maybeSingle();
    setSettings(data);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (form: Record<string, any>) => {
    if (!shopId) return false;
    if (settings?.id) {
      const { error } = await (supabase as any).from('export_module_settings').update(form).eq('id', settings.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    } else {
      const { error } = await (supabase as any).from('export_module_settings').insert({ ...form, shop_id: shopId });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    }
    toast({ title: 'Settings saved' });
    fetch();
    return true;
  };

  return { settings, loading, fetch, save };
}
