import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { ScheduleCoverage } from '@/types/shift-template';

export function useScheduleCoverage() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState<ScheduleCoverage[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchCoverage();
    }
  }, [shopId]);

  const fetchCoverage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schedule_coverage_summary')
        .select('*')
        .eq('shop_id', shopId)
        .order('day_of_week')
        .order('hour_block');

      if (error) throw error;
      setCoverage(data as any || []);
    } catch (error: any) {
      console.error('Error fetching schedule coverage:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedule coverage',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    coverage,
    refetch: fetchCoverage
  };
}
