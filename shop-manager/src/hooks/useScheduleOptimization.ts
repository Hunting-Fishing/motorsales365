import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { ScheduleOptimizationMetrics } from '@/types/phase5';

export function useScheduleOptimization() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ScheduleOptimizationMetrics[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchMetrics();
    }
  }, [shopId]);

  const fetchMetrics = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_optimization_metrics')
        .select('*')
        .eq('shop_id', shopId)
        .order('metric_date', { ascending: false });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error: any) {
      console.error('Error fetching optimization metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load optimization metrics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    metrics,
    refetch: fetchMetrics
  };
}
