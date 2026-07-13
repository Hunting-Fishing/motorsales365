import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useShopId } from './useShopId';

export interface TimesheetEntry {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string | null;
  total_hours: number | null;
  activity_type_id: string | null;
  vessel_id: string | null;
  work_location_type: string;
  work_description: string;
  location: string | null;
  comments: string | null;
  status: string | null;
}

export interface NewTimesheetEntry {
  start_time: string;
  end_time: string;
  activity_type_id: string;
  vessel_id: string | null;
  work_location_type: string;
  work_description: string;
  comments: string;
}

export function useDailyTimesheet(selectedDate: Date) {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEntries();
    }
  }, [userId, selectedDate]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Get user profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      if (profile) {
        setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Employee');
      }
    }
  };

  const fetchEntries = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('id, employee_id, work_date, start_time, end_time, total_hours, activity_type_id, vessel_id, work_location_type, work_description, location, comments, status')
        .eq('employee_id', userId)
        .eq('work_date', dateStr)
        .order('start_time');

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error fetching timesheet entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timesheet entries',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let hours = endHour - startHour;
    let mins = endMin - startMin;
    
    if (mins < 0) {
      hours -= 1;
      mins += 60;
    }
    
    // Handle overnight shifts
    if (hours < 0) {
      hours += 24;
    }
    
    return Math.round((hours + mins / 60) * 100) / 100;
  };

  const saveEntries = async (newEntries: NewTimesheetEntry[], additionalComments: string) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'Please log in to save timesheet entries',
        variant: 'destructive'
      });
      return false;
    }

    setSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Delete existing entries for this date
      const { error: deleteError } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('employee_id', userId)
        .eq('work_date', dateStr);

      if (deleteError) throw deleteError;

      // Filter out empty entries
      const validEntries = newEntries.filter(e => e.start_time && e.end_time);
      
      if (validEntries.length === 0) {
        toast({
          title: 'Success',
          description: 'Timesheet cleared for this date'
        });
        await fetchEntries();
        return true;
      }

      // Insert new entries
      const entriesToInsert = validEntries.map((entry, index) => ({
        employee_id: userId,
        work_date: dateStr,
        start_time: entry.start_time,
        end_time: entry.end_time,
        total_hours: calculateHours(entry.start_time, entry.end_time),
        activity_type_id: entry.activity_type_id || null,
        vessel_id: entry.vessel_id || null,
        work_location_type: entry.work_location_type || 'on_site',
        work_description: entry.work_description || 'Daily timesheet entry',
        comments: index === 0 && additionalComments ? 
          (entry.comments ? `${entry.comments} | ${additionalComments}` : additionalComments) : 
          entry.comments || null,
        status: 'submitted'
      }));

      const { error: insertError } = await supabase
        .from('timesheet_entries')
        .insert(entriesToInsert);

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: `Saved ${validEntries.length} timesheet entries`
      });
      
      await fetchEntries();
      return true;
    } catch (error: any) {
      console.error('Error saving timesheet entries:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save timesheet entries',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const dailyTotal = entries.reduce((sum, e) => sum + (e.total_hours || 0), 0);

  return {
    entries,
    loading,
    saving,
    userName,
    dailyTotal,
    calculateHours,
    saveEntries,
    refetch: fetchEntries
  };
}
