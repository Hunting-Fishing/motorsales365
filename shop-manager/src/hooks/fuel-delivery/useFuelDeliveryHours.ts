import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FuelDeliveryHour {
  id?: string;
  shop_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useFuelDeliveryHours(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-hours', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('fuel_delivery_hours')
        .select('*')
        .eq('shop_id', shopId)
        .order('day_of_week');
      
      if (error) throw error;
      return data as FuelDeliveryHour[];
    },
    enabled: !!shopId,
  });

  // Memoize hours with defaults to prevent infinite re-renders
  const hoursWithDefaults = useMemo(() => {
    const existingHours = query.data || [];
    
    return DAY_NAMES.map((_, index) => {
      const existing = existingHours.find(h => h.day_of_week === index);
      if (existing) return existing;
      
      // Default: Mon-Fri 8AM-5PM, Sat-Sun closed
      const isWeekend = index === 0 || index === 6;
      return {
        shop_id: shopId || '',
        day_of_week: index,
        open_time: '08:00:00',
        close_time: '17:00:00',
        is_closed: isWeekend,
      };
    });
  }, [query.data, shopId]);

  const saveMutation = useMutation({
    mutationFn: async (hours: FuelDeliveryHour[]) => {
      if (!shopId) throw new Error('Shop ID required');
      
      // Upsert all hours
      for (const hour of hours) {
        const { error } = await supabase
          .from('fuel_delivery_hours')
          .upsert({
            shop_id: shopId,
            day_of_week: hour.day_of_week,
            open_time: hour.open_time,
            close_time: hour.close_time,
            is_closed: hour.is_closed,
          }, {
            onConflict: 'shop_id,day_of_week',
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-hours', shopId] });
      toast.success('Hours of operation saved');
    },
    onError: (error: any) => {
      console.error('Save hours error:', error);
      toast.error('Failed to save hours');
    },
  });

  return {
    hours: hoursWithDefaults,
    isLoading: query.isLoading,
    isSaving: saveMutation.isPending,
    saveHours: saveMutation.mutate,
    dayNames: DAY_NAMES,
  };
}
