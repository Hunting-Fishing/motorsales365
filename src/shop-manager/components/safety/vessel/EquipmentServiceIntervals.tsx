import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ServiceIntervalCountdown } from '../forklift/ServiceIntervalCountdown';

interface EquipmentServiceIntervalsProps {
  equipmentId: string;
  currentHours: number;
}

export function EquipmentServiceIntervals({ equipmentId, currentHours }: EquipmentServiceIntervalsProps) {
  const { data: intervals, isLoading } = useQuery({
    queryKey: ['equipment-intervals', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_interval_tracking')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return data?.map(interval => ({
        id: interval.id,
        interval_name: interval.interval_name,
        interval_hours: interval.interval_hours || 0,
        last_service_hours: interval.last_service_hours || 0,
        next_service_hours: interval.next_service_hours || 0,
        last_service_date: interval.last_service_date
      })) || [];
    },
    enabled: !!equipmentId
  });

  if (isLoading || !intervals || intervals.length === 0) {
    return null;
  }

  return (
    <ServiceIntervalCountdown 
      intervals={intervals} 
      currentHours={currentHours} 
    />
  );
}
