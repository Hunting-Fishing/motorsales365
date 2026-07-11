import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  schedule_name: string;
  description?: string;
  trigger_type: 'time-based' | 'usage-based' | 'both';
  time_interval_days?: number;
  last_service_date?: string;
  next_service_date?: string;
  usage_interval?: number;
  usage_metric?: 'hours' | 'kilometers' | 'miles';
  last_service_reading?: number;
  next_service_reading?: number;
  average_daily_usage?: number;
  predicted_service_date?: string;
  locked_service_date?: string;
  estimated_duration_hours?: number;
  required_parts?: any[];
  assigned_technician?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'due_soon' | 'overdue' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export function useMaintenanceSchedules(equipmentId?: string) {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('maintenance_schedules_enhanced')
        .select('*')
        .order('next_service_date', { ascending: true });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchedules((data || []) as MaintenanceSchedule[]);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load maintenance schedules',
      });
    } finally {
      setLoading(false);
    }
  }, [equipmentId, toast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = useCallback(async (scheduleData: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_schedules_enhanced')
        .insert([scheduleData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Maintenance schedule created',
      });

      await fetchSchedules();
      return data;
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create schedule',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchSchedules, toast]);

  const updateSchedule = useCallback(async (id: string, updates: any) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_schedules_enhanced')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule updated',
      });

      await fetchSchedules();
      return data;
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update schedule',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchSchedules, toast]);

  return {
    schedules,
    loading,
    fetchSchedules,
    createSchedule,
    updateSchedule,
  };
}
