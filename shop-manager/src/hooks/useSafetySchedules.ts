import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import { addDays, format } from 'date-fns';
import type { SafetySchedule } from '@/types/safety';

export interface CreateScheduleData {
  schedule_name: string;
  schedule_type: string;
  inspection_type?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'hours_based';
  next_due_date: string;
  reminder_days_before?: number;
  hours_interval?: number;
  equipment_id?: string;
  vehicle_id?: string;
  notes?: string;
}

const DEFAULT_SCHEDULES: Omit<CreateScheduleData, 'next_due_date'>[] = [
  // Daily checks
  { schedule_name: 'Daily Shop Inspection', schedule_type: 'daily_inspection', frequency: 'daily', reminder_days_before: 0 },
  { schedule_name: 'Daily Lift Pre-Use Check', schedule_type: 'lift_daily', frequency: 'daily', reminder_days_before: 0 },
  
  // Weekly checks
  { schedule_name: 'Weekly Lift/Hoist Inspection', schedule_type: 'lift_inspection', frequency: 'weekly', reminder_days_before: 1 },
  { schedule_name: 'Weekly Eye Wash Station Check', schedule_type: 'eyewash_check', frequency: 'weekly', reminder_days_before: 1 },
  { schedule_name: 'Weekly First Aid Kit Check', schedule_type: 'first_aid', frequency: 'weekly', reminder_days_before: 1 },
  
  // Monthly checks
  { schedule_name: 'Monthly Fire Extinguisher Inspection', schedule_type: 'fire_extinguisher', frequency: 'monthly', reminder_days_before: 3 },
  { schedule_name: 'Monthly Safety Review Meeting', schedule_type: 'safety_meeting', frequency: 'monthly', reminder_days_before: 3 },
  { schedule_name: 'Monthly Spill Kit Inspection', schedule_type: 'spill_kit', frequency: 'monthly', reminder_days_before: 3 },
  { schedule_name: 'Monthly Emergency Exit Inspection', schedule_type: 'emergency_exit', frequency: 'monthly', reminder_days_before: 3 },
  
  // Quarterly checks
  { schedule_name: 'Quarterly Safety Training', schedule_type: 'training', frequency: 'quarterly', reminder_days_before: 7 },
  { schedule_name: 'Quarterly PPE Inventory', schedule_type: 'ppe_inventory', frequency: 'quarterly', reminder_days_before: 7 },
  { schedule_name: 'Quarterly Ventilation System Check', schedule_type: 'ventilation', frequency: 'quarterly', reminder_days_before: 7 },
  { schedule_name: 'Quarterly Coolant Flush (Fleet)', schedule_type: 'vehicle_maintenance', frequency: 'quarterly', reminder_days_before: 7 },
  
  // Annual checks
  { schedule_name: 'Annual Lift Certification', schedule_type: 'lift_certification', frequency: 'annual', reminder_days_before: 30 },
  { schedule_name: 'Annual Fire Suppression Inspection', schedule_type: 'fire_suppression', frequency: 'annual', reminder_days_before: 30 },
  { schedule_name: 'Annual OSHA Compliance Review', schedule_type: 'osha_review', frequency: 'annual', reminder_days_before: 30 }
];

export function useSafetySchedules() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<SafetySchedule[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchSchedules();
    }
  }, [shopId]);

  const fetchSchedules = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('safety_schedules' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('next_due_date') as any);

      if (error) throw error;

      // If no schedules exist, create defaults
      if (!data || data.length === 0) {
        await createDefaultSchedules();
        return;
      }

      setSchedules(data as SafetySchedule[]);
    } catch (error: any) {
      console.error('Error fetching safety schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSchedules = async () => {
    if (!shopId) return;

    const today = new Date();
    const schedulesToCreate = DEFAULT_SCHEDULES.map(schedule => {
      let nextDue: Date;
      switch (schedule.frequency) {
        case 'daily':
          nextDue = today;
          break;
        case 'weekly':
          nextDue = addDays(today, 7 - today.getDay());
          break;
        case 'monthly':
          nextDue = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          break;
        case 'quarterly':
          nextDue = new Date(today.getFullYear(), Math.ceil((today.getMonth() + 1) / 3) * 3, 1);
          break;
        case 'annual':
          nextDue = new Date(today.getFullYear() + 1, 0, 1);
          break;
        default:
          nextDue = today;
      }

      return {
        ...schedule,
        shop_id: shopId,
        next_due_date: format(nextDue, 'yyyy-MM-dd'),
        is_enabled: true
      };
    });

    try {
      const { error } = await (supabase
        .from('safety_schedules' as any)
        .insert(schedulesToCreate) as any);

      if (error) throw error;
      await fetchSchedules();
    } catch (error) {
      console.error('Error creating default schedules:', error);
    }
  };

  const createSchedule = async (data: CreateScheduleData) => {
    if (!shopId) return null;

    try {
      const { data: schedule, error } = await (supabase
        .from('safety_schedules' as any)
        .insert({
          shop_id: shopId,
          ...data,
          is_enabled: true
        })
        .select()
        .single() as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule created successfully'
      });

      await fetchSchedules();
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

  const updateSchedule = async (id: string, updates: Partial<SafetySchedule>) => {
    try {
      const { error } = await (supabase
        .from('safety_schedules' as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id) as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule updated'
      });

      await fetchSchedules();
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive'
      });
    }
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    await updateSchedule(id, { is_enabled: enabled });
  };

  const markCompleted = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;

    const today = new Date();
    let nextDue: Date;
    
    switch (schedule.frequency) {
      case 'daily':
        nextDue = addDays(today, 1);
        break;
      case 'weekly':
        nextDue = addDays(today, 7);
        break;
      case 'monthly':
        nextDue = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        break;
      case 'quarterly':
        nextDue = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
        break;
      case 'annual':
        nextDue = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
        break;
      default:
        nextDue = addDays(today, 1);
    }

    await updateSchedule(id, {
      last_completed_date: format(today, 'yyyy-MM-dd'),
      next_due_date: format(nextDue, 'yyyy-MM-dd')
    });
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await (supabase
        .from('safety_schedules' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Schedule deleted'
      });

      await fetchSchedules();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    schedules,
    createSchedule,
    updateSchedule,
    toggleSchedule,
    markCompleted,
    deleteSchedule,
    refetch: fetchSchedules
  };
}