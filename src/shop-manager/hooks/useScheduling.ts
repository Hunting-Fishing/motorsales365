import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { TimeOffRequest, WorkScheduleAssignment, PTOBalance, EmployeeAccommodation } from '@/types/scheduling';

export function useScheduling() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [schedules, setSchedules] = useState<WorkScheduleAssignment[]>([]);
  const [ptoBalances, setPtoBalances] = useState<PTOBalance[]>([]);
  const [accommodations, setAccommodations] = useState<EmployeeAccommodation[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchAllData();
    }
  }, [shopId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTimeOffRequests(),
        fetchSchedules(),
        fetchPTOBalances(),
        fetchAccommodations()
      ]);
    } catch (error: any) {
      console.error('Error fetching scheduling data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load scheduling data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeOffRequests = async () => {
    const { data, error } = await supabase
      .from('time_off_requests')
      .select(`
        *,
        time_off_types(*),
        profiles:employee_id(first_name, last_name, email)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setTimeOffRequests(data as any || []);
  };

  const fetchSchedules = async () => {
    const { data, error } = await supabase
      .from('work_schedule_assignments')
      .select(`
        *,
        profiles:employee_id(first_name, last_name)
      `)
      .eq('shop_id', shopId)
      .order('day_of_week');

    if (error) throw error;
    setSchedules(data as any || []);
  };

  const fetchPTOBalances = async () => {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('pto_balances')
      .select(`
        *,
        time_off_types(*)
      `)
      .eq('shop_id', shopId)
      .eq('year', currentYear);

    if (error) throw error;
    setPtoBalances(data || []);
  };

  const fetchAccommodations = async () => {
    const { data, error } = await supabase
      .from('employee_accommodations')
      .select('*')
      .eq('shop_id', shopId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setAccommodations(data as any || []);
  };

  const createTimeOffRequest = async (request: Partial<TimeOffRequest>) => {
    const { data, error } = await supabase
      .from('time_off_requests')
      .insert([{ ...request, shop_id: shopId } as any])
      .select()
      .single();

    if (error) throw error;
    await fetchTimeOffRequests();
    return data;
  };

  const updateTimeOffRequest = async (id: string, updates: Partial<TimeOffRequest>) => {
    const { error } = await supabase
      .from('time_off_requests')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await fetchTimeOffRequests();
  };

  const createSchedule = async (schedule: Partial<WorkScheduleAssignment>) => {
    const { data, error } = await supabase
      .from('work_schedule_assignments')
      .insert([{ ...schedule, shop_id: shopId } as any])
      .select()
      .single();

    if (error) throw error;
    await fetchSchedules();
    return data;
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from('work_schedule_assignments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchSchedules();
  };

  return {
    loading,
    timeOffRequests,
    schedules,
    ptoBalances,
    accommodations,
    createTimeOffRequest,
    updateTimeOffRequest,
    createSchedule,
    deleteSchedule,
    refetch: fetchAllData
  };
}
