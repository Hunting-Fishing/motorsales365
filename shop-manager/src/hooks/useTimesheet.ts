import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek } from 'date-fns';

export interface TimesheetEntry {
  id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string | null;
  break_minutes: number;
  total_hours: number;
  work_location_type: 'vessel' | 'yard' | 'shop' | 'office' | 'field';
  vessel_id: string | null;
  work_order_id: string | null;
  work_description: string;
  job_code: string | null;
  is_overtime: boolean;
  is_billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  equipment_assets?: {
    id: string;
    name: string;
    asset_number: string | null;
  };
}

export function useTimesheet(weekStart?: Date) {
  const queryClient = useQueryClient();
  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  // Fetch timesheet entries for current week
  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['timesheet-entries', currentWeekStart.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          equipment_assets (
            id,
            name,
            asset_number
          )
        `)
        .eq('employee_id', user.id)
        .gte('work_date', currentWeekStart.toISOString().split('T')[0])
        .lte('work_date', currentWeekEnd.toISOString().split('T')[0])
        .order('work_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data as TimesheetEntry[];
    },
  });

  // Fetch available vessels
  const { data: vessels } = useQuery({
    queryKey: ['vessels-for-timesheet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Add timesheet entry
  const addEntry = useMutation({
    mutationFn: async (entry: Omit<TimesheetEntry, 'id' | 'employee_id' | 'created_at' | 'updated_at' | 'total_hours' | 'equipment_assets'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert([{
          ...entry,
          employee_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
      toast({
        title: 'Success',
        description: 'Timesheet entry added successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add timesheet entry',
        variant: 'destructive',
      });
    },
  });

  // Update timesheet entry
  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimesheetEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
      toast({
        title: 'Success',
        description: 'Timesheet entry updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update timesheet entry',
        variant: 'destructive',
      });
    },
  });

  // Delete timesheet entry
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-entries'] });
      toast({
        title: 'Success',
        description: 'Timesheet entry deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete timesheet entry',
        variant: 'destructive',
      });
    },
  });

  // Calculate totals
  const totals = entries?.reduce((acc, entry) => ({
    totalHours: acc.totalHours + (entry.total_hours || 0),
    overtimeHours: acc.overtimeHours + (entry.is_overtime ? (entry.total_hours || 0) : 0),
    billableHours: acc.billableHours + (entry.is_billable ? (entry.total_hours || 0) : 0),
  }), { totalHours: 0, overtimeHours: 0, billableHours: 0 });

  return {
    entries,
    vessels,
    isLoading,
    error,
    totals,
    addEntry: addEntry.mutate,
    updateEntry: updateEntry.mutate,
    deleteEntry: deleteEntry.mutate,
    isAdding: addEntry.isPending,
    isUpdating: updateEntry.isPending,
    isDeleting: deleteEntry.isPending,
  };
}
