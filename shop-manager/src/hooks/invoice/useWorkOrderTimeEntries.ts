
import { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '@/types/workOrder';
import { supabase } from '@/integrations/supabase/client';

interface UseWorkOrderTimeEntriesProps {
  workOrderId: string;
  initialTimeEntries?: TimeEntry[];
}

export const useWorkOrderTimeEntries = ({ workOrderId, initialTimeEntries }: UseWorkOrderTimeEntriesProps) => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(initialTimeEntries || []);
  const [loading, setLoading] = useState(false);

  const fetchTimeEntries = useCallback(async () => {
    if (!workOrderId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('work_order_time_entries')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    if (!initialTimeEntries) {
      fetchTimeEntries();
    }
  }, [workOrderId, initialTimeEntries, fetchTimeEntries]);

  const addTimeEntry = async (entry: Omit<TimeEntry, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('work_order_time_entries')
        .insert({
          work_order_id: workOrderId,
          employee_id: entry.employee_id,
          employee_name: entry.employee_name,
          start_time: entry.start_time,
          end_time: entry.end_time,
          duration: entry.duration,
          billable: entry.billable,
          notes: entry.notes
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        setTimeEntries(prev => [data, ...prev]);
      }
      return data;
    } catch (error) {
      console.error('Error adding time entry:', error);
      throw error;
    }
  };

  const updateTimeEntry = async (id: string, updates: Partial<TimeEntry>) => {
    try {
      const { error } = await supabase
        .from('work_order_time_entries')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      setTimeEntries(prev => prev.map(entry => 
        entry.id === id ? { ...entry, ...updates } : entry
      ));
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }
  };

  const removeTimeEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_order_time_entries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setTimeEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error removing time entry:', error);
      throw error;
    }
  };

  return {
    timeEntries,
    loading,
    addTimeEntry,
    updateTimeEntry,
    removeTimeEntry,
    refetch: fetchTimeEntries
  };
};
