import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { SchedulingConflict } from '@/types/scheduling-conflicts';

export function useSchedulingConflicts(dateRangeStart: Date, dateRangeEnd: Date) {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) {
      detectConflicts();
    }
  }, [shopId, dateRangeStart, dateRangeEnd]);

  const detectConflicts = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('detect_schedule_conflicts', {
        p_shop_id: shopId,
        p_date_range_start: dateRangeStart.toISOString().split('T')[0],
        p_date_range_end: dateRangeEnd.toISOString().split('T')[0]
      });

      if (error) throw error;

      // Fetch full conflict details
      const { data: conflictsData, error: conflictsError } = await supabase
        .from('scheduling_conflicts')
        .select(`
          *,
          profiles!employee_id(first_name, last_name, email)
        `)
        .eq('shop_id', shopId)
        .gte('conflict_date', dateRangeStart.toISOString().split('T')[0])
        .lte('conflict_date', dateRangeEnd.toISOString().split('T')[0])
        .eq('is_resolved', false)
        .order('severity', { ascending: false })
        .order('conflict_date');

      if (conflictsError) throw conflictsError;
      setConflicts(conflictsData || []);
    } catch (error: any) {
      console.error('Error detecting conflicts:', error);
      toast({
        title: 'Error',
        description: 'Failed to detect scheduling conflicts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (conflictId: string, resolutionNotes?: string) => {
    try {
      const { error } = await supabase
        .from('scheduling_conflicts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolution_notes: resolutionNotes
        })
        .eq('id', conflictId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Conflict resolved successfully'
      });

      await detectConflicts();
    } catch (error: any) {
      console.error('Error resolving conflict:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve conflict',
        variant: 'destructive'
      });
    }
  };

  return {
    conflicts,
    loading,
    detectConflicts,
    resolveConflict
  };
}
