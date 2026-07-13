import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { OvertimeTracking } from '@/types/phase5';

export function useOvertimeTracking(employeeId?: string) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [overtimeData, setOvertimeData] = useState<OvertimeTracking[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchOvertimeData();
    }
  }, [shopId, employeeId]);

  const fetchOvertimeData = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('overtime_tracking')
        .select('*')
        .eq('shop_id', shopId)
        .order('week_start_date', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOvertimeData(data as any || []); // Cast to handle status enum mismatch
    } catch (error: any) {
      console.error('Error fetching overtime data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load overtime data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    overtimeData,
    refetch: fetchOvertimeData
  };
}
