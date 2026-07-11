import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportBusinessProfile() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_business_profiles').select('*').eq('shop_id', shopId).maybeSingle();
    setProfile(data);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async (form: Record<string, any>) => {
    if (!shopId) return false;
    if (profile?.id) {
      const { error } = await (supabase as any).from('export_business_profiles').update(form).eq('id', profile.id);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    } else {
      const { error } = await (supabase as any).from('export_business_profiles').insert({ ...form, shop_id: shopId });
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    }
    toast({ title: 'Profile saved' });
    fetch();
    return true;
  };

  return { profile, loading, fetch, save };
}
