import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { TimeCardEntry } from '@/types/phase5';

export function useTimeCards(employeeId?: string) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeCards, setTimeCards] = useState<TimeCardEntry[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchTimeCards();
    }
  }, [shopId, employeeId]);

  const fetchTimeCards = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('time_card_entries')
        .select('*')
        .eq('shop_id', shopId)
        .order('clock_in_time', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTimeCards(data as any || []);
    } catch (error: any) {
      console.error('Error fetching time cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load time cards',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async (employeeId: string, hourlyRate?: number, notes?: string) => {
    if (!shopId) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('time_card_entries')
        .insert([{
          shop_id: shopId,
          employee_id: employeeId,
          clock_in_time: new Date().toISOString(),
          hourly_rate: hourlyRate,
          notes: notes,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      
      await fetchTimeCards();
      toast({
        title: 'Success',
        description: 'Clocked in successfully'
      });
      return data;
    } catch (error: any) {
      console.error('Error clocking in:', error);
      toast({
        title: 'Error',
        description: 'Failed to clock in',
        variant: 'destructive'
      });
    }
  };

  const clockOut = async (timeCardId: string, notes?: string) => {
    try {
      const clockOutTime = new Date().toISOString();
      
      // Get the time card to calculate hours
      const { data: timeCard } = await supabase
        .from('time_card_entries')
        .select('*')
        .eq('id', timeCardId)
        .maybeSingle();

      if (!timeCard) throw new Error('Time card not found');

      const clockInTime = new Date(timeCard.clock_in_time);
      const clockOutDate = new Date(clockOutTime);
      let totalSeconds = (clockOutDate.getTime() - clockInTime.getTime()) / 1000;
      
      // Subtract break time
      const breakMinutes = timeCard.break_duration_minutes || 0;
      totalSeconds -= breakMinutes * 60;
      
      const totalHours = Math.max(0, totalSeconds / 3600);
      const regularHours = Math.min(totalHours, 8);
      const overtimeHours = Math.max(0, totalHours - 8);
      const totalPay = timeCard.hourly_rate 
        ? (regularHours * timeCard.hourly_rate) + (overtimeHours * timeCard.hourly_rate * 1.5)
        : null;

      const updateData: any = {
        clock_out_time: clockOutTime,
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        total_pay: totalPay,
        status: 'completed'
      };

      // Append notes if provided
      if (notes) {
        updateData.notes = timeCard.notes ? `${timeCard.notes}\n${notes}` : notes;
      }

      const { error } = await supabase
        .from('time_card_entries')
        .update(updateData)
        .eq('id', timeCardId);

      if (error) throw error;
      
      await fetchTimeCards();
      toast({
        title: 'Success',
        description: 'Clocked out successfully'
      });
    } catch (error: any) {
      console.error('Error clocking out:', error);
      toast({
        title: 'Error',
        description: 'Failed to clock out',
        variant: 'destructive'
      });
    }
  };

  const startBreak = async (timeCardId: string) => {
    try {
      const { error } = await supabase
        .from('time_card_entries')
        .update({
          break_start_time: new Date().toISOString()
        })
        .eq('id', timeCardId);

      if (error) throw error;
      
      await fetchTimeCards();
      toast({
        title: 'Break Started',
        description: 'Enjoy your break!'
      });
    } catch (error: any) {
      console.error('Error starting break:', error);
      toast({
        title: 'Error',
        description: 'Failed to start break',
        variant: 'destructive'
      });
    }
  };

  const endBreak = async (timeCardId: string) => {
    try {
      // Get current time card to calculate break duration
      const { data: timeCard } = await supabase
        .from('time_card_entries')
        .select('*')
        .eq('id', timeCardId)
        .maybeSingle();

      if (!timeCard || !timeCard.break_start_time) {
        throw new Error('No active break found');
      }

      const breakStart = new Date(timeCard.break_start_time);
      const breakEnd = new Date();
      const breakDurationMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000);
      
      // Add to existing break minutes
      const totalBreakMinutes = (timeCard.break_duration_minutes || 0) + breakDurationMinutes;

      const { error } = await supabase
        .from('time_card_entries')
        .update({
          break_end_time: breakEnd.toISOString(),
          break_duration_minutes: totalBreakMinutes
        })
        .eq('id', timeCardId);

      if (error) throw error;
      
      await fetchTimeCards();
      toast({
        title: 'Break Ended',
        description: `Break lasted ${breakDurationMinutes} minutes`
      });
    } catch (error: any) {
      console.error('Error ending break:', error);
      toast({
        title: 'Error',
        description: 'Failed to end break',
        variant: 'destructive'
      });
    }
  };

  const approveTimeCard = async (timeCardId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_card_entries')
        .update({
          status: 'approved',
          approved_by: userData.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', timeCardId);

      if (error) throw error;
      
      await fetchTimeCards();
      toast({
        title: 'Success',
        description: 'Time card approved'
      });
    } catch (error: any) {
      console.error('Error approving time card:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve time card',
        variant: 'destructive'
      });
    }
  };

  const updateTimeCard = async (timeCardId: string, updates: Partial<TimeCardEntry>) => {
    try {
      const { error } = await supabase
        .from('time_card_entries')
        .update(updates)
        .eq('id', timeCardId);

      if (error) throw error;
      
      await fetchTimeCards();
      toast({
        title: 'Success',
        description: 'Time card updated'
      });
    } catch (error: any) {
      console.error('Error updating time card:', error);
      toast({
        title: 'Error',
        description: 'Failed to update time card',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    timeCards,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    approveTimeCard,
    updateTimeCard,
    refetch: fetchTimeCards
  };
}
