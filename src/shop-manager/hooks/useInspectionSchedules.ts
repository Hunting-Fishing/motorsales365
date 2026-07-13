/**
 * @deprecated Use useSafetySchedules instead. This hook is kept for backward compatibility
 * and now queries the consolidated safety_schedules table.
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface InspectionSchedule {
  id: string;
  shop_id: string;
  equipment_id?: string;
  vehicle_id?: string;
  inspection_type: string;
  schedule_name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'hours_based';
  frequency_value: number;
  hours_interval?: number;
  assigned_to?: string;
  is_active: boolean;
  last_inspection_date?: string;
  next_due_date?: string;
  reminder_days_before: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduleData {
  equipment_id?: string;
  vehicle_id?: string;
  inspection_type: string;
  schedule_name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'hours_based';
  frequency_value?: number;
  hours_interval?: number;
  assigned_to?: string;
  reminder_days_before?: number;
  notes?: string;
}

/**
 * @deprecated Use useSafetySchedules instead
 */
export function useInspectionSchedules() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchSchedules();
    }
  }, [shopId]);

  const fetchSchedules = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      // Now using consolidated safety_schedules table
      const { data, error } = await (supabase
        .from('safety_schedules' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('next_due_date', { ascending: true }) as any);

      if (error) throw error;
      
      // Map to InspectionSchedule interface for backward compatibility
      const mapped = (data || []).map((s: any) => ({
        ...s,
        inspection_type: s.inspection_type || s.schedule_type,
        frequency_value: 1,
        is_active: s.is_enabled,
        last_inspection_date: s.last_completed_date,
      }));
      
      setSchedules(mapped as InspectionSchedule[]);
    } catch (error: any) {
      console.error('Error fetching inspection schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inspection schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (data: CreateScheduleData) => {
    if (!shopId) return null;
    
    try {
      const nextDueDate = calculateNextDueDate(data.frequency, data.frequency_value || 1);

      const { data: schedule, error } = await (supabase
        .from('safety_schedules' as any)
        .insert({
          shop_id: shopId,
          schedule_name: data.schedule_name,
          schedule_type: data.inspection_type,
          inspection_type: data.inspection_type,
          frequency: data.frequency,
          hours_interval: data.hours_interval,
          equipment_id: data.equipment_id,
          vehicle_id: data.vehicle_id,
          reminder_days_before: data.reminder_days_before || 1,
          notes: data.notes,
          next_due_date: nextDueDate.toISOString().split('T')[0],
          is_enabled: true
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchSchedules();
      toast({
        title: 'Success',
        description: 'Inspection schedule created'
      });
      
      return schedule;
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create schedule',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<CreateScheduleData>) => {
    try {
      const { error } = await (supabase
        .from('safety_schedules' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id) as any);

      if (error) throw error;
      
      await fetchSchedules();
      toast({ title: 'Schedule updated' });
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive'
      });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await (supabase
        .from('safety_schedules' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;
      
      await fetchSchedules();
      toast({ title: 'Schedule deleted' });
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive'
      });
    }
  };

  const markInspectionComplete = async (scheduleId: string) => {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    const nextDueDate = calculateNextDueDate(schedule.frequency, schedule.frequency_value);
    
    try {
      const { error } = await (supabase
        .from('safety_schedules' as any)
        .update({
          last_completed_date: new Date().toISOString().split('T')[0],
          next_due_date: nextDueDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId) as any);

      if (error) throw error;
      await fetchSchedules();
    } catch (error: any) {
      console.error('Error marking inspection complete:', error);
    }
  };

  return {
    loading,
    schedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    markInspectionComplete,
    refetch: fetchSchedules
  };
}

function calculateNextDueDate(frequency: string, value: number): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.setDate(now.getDate() + value));
    case 'weekly':
      return new Date(now.setDate(now.getDate() + (value * 7)));
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + value));
    default:
      return new Date(now.setDate(now.getDate() + 1));
  }
}
