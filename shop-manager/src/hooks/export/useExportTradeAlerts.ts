import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';

export function useExportTradeAlerts() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = alerts.filter(a => !a.is_read && !a.is_dismissed).length;

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await (supabase as any).from('export_trade_alerts').select('*').eq('shop_id', shopId).eq('is_dismissed', false).order('triggered_at', { ascending: false });
    setAlerts(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = async (id: string) => {
    await (supabase as any).from('export_trade_alerts').update({ is_read: true }).eq('id', id);
    fetch();
  };

  const dismiss = async (id: string) => {
    await (supabase as any).from('export_trade_alerts').update({ is_dismissed: true }).eq('id', id);
    fetch();
  };

  const dismissAll = async () => {
    if (!shopId) return;
    await (supabase as any).from('export_trade_alerts').update({ is_dismissed: true }).eq('shop_id', shopId).eq('is_dismissed', false);
    toast({ title: 'All alerts dismissed' });
    fetch();
  };

  const create = async (form: Record<string, any>) => {
    if (!shopId) return false;
    const { error } = await (supabase as any).from('export_trade_alerts').insert({ ...form, shop_id: shopId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    fetch(); return true;
  };

  return { alerts, loading, unreadCount, fetch, create, markRead, dismiss, dismissAll };
}
