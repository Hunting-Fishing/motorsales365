import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { LaborCostAnalytics } from '@/types/phase5';

export function useLaborAnalytics(startDate?: string, endDate?: string) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<LaborCostAnalytics[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchAnalytics();
    }
  }, [shopId, startDate, endDate]);

  const fetchAnalytics = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('labor_cost_analytics')
        .select('*')
        .eq('shop_id', shopId)
        .order('period_start', { ascending: false });

      if (startDate) {
        query = query.gte('period_start', startDate);
      }
      if (endDate) {
        query = query.lte('period_end', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error: any) {
      console.error('Error fetching labor analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load labor analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    analytics,
    refetch: fetchAnalytics
  };
}
