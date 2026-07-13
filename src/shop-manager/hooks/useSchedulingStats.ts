import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { SchedulingStatistics } from '@/types/scheduling-conflicts';

export function useSchedulingStats(date: Date) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [stats, setStats] = useState<SchedulingStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) {
      fetchStats();
    }
  }, [shopId, date]);

  const fetchStats = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Calculate stats for the date
      await supabase.rpc('calculate_scheduling_statistics', {
        p_shop_id: shopId,
        p_date: dateStr
      });

      // Fetch the calculated stats
      const { data, error } = await supabase
        .from('scheduling_statistics')
        .select('*')
        .eq('shop_id', shopId)
        .eq('stat_date', dateStr)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch scheduling statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}
