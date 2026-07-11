import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

export function useExportActivityLog() {
  const { shopId } = useShopId();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    const { data } = await supabase
      .from('export_activity_log')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data || []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { fetch(); }, [fetch]);

  const logActivity = async (action: string, entityType: string, entityId?: string, entityLabel?: string, details?: Record<string, any>) => {
    if (!shopId) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('export_activity_log').insert({
      shop_id: shopId,
      user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      details,
    } as any);
  };

  return { logs, loading, fetch, logActivity };
}
