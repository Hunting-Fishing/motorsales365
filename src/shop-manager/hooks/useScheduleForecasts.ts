import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { ScheduleForecast } from '@/types/phase5';

export function useScheduleForecasts(forecastType?: string) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<ScheduleForecast[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchForecasts();
    }
  }, [shopId, forecastType]);

  const fetchForecasts = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('schedule_forecasts')
        .select('*')
        .eq('shop_id', shopId)
        .order('forecast_date', { ascending: false });

      if (forecastType) {
        query = query.eq('forecast_type', forecastType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setForecasts(data as any || []);
    } catch (error: any) {
      console.error('Error fetching forecasts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedule forecasts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    forecasts,
    refetch: fetchForecasts
  };
}
