import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import { format } from 'date-fns';

export interface InspectionAssignment {
  id: string;
  shop_id: string;
  staff_id: string;
  schedule_id?: string;
  inspection_type: string;
  shift?: 'morning' | 'afternoon' | 'night';
  assignment_date: string;
  is_completed: boolean;
  completed_at?: string;
  notes?: string;
  staff?: {
    first_name: string;
    last_name: string;
  };
}

export interface CreateAssignmentData {
  staff_id: string;
  inspection_type: string;
  shift?: 'morning' | 'afternoon' | 'night';
  assignment_date: string;
  schedule_id?: string;
}

export function useInspectionAssignments() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<InspectionAssignment[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchAssignments();
    }
  }, [shopId]);

  const fetchAssignments = async () => {
    if (!shopId) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('inspection_assignments' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('assignment_date', { ascending: false }) as any);

      if (error) throw error;

      // Fetch staff names
      const staffIds = [...new Set((data || []).map((a: any) => a.staff_id))] as string[];
      let staffMap: Record<string, { first_name: string; last_name: string }> = {};

      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', staffIds);

        staffData?.forEach(s => {
          staffMap[s.id] = { first_name: s.first_name || '', last_name: s.last_name || '' };
        });
      }

      const assignmentsWithStaff = (data || []).map((a: any) => ({
        ...a,
        staff: staffMap[a.staff_id]
      }));

      setAssignments(assignmentsWithStaff);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (data: CreateAssignmentData) => {
    if (!shopId) return null;

    try {
      const { data: assignment, error } = await (supabase
        .from('inspection_assignments' as any)
        .insert({
          shop_id: shopId,
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment created'
      });

      await fetchAssignments();
      return assignment;
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive'
      });
      return null;
    }
  };

  const markCompleted = async (id: string) => {
    try {
      const { error } = await (supabase
        .from('inspection_assignments' as any)
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', id) as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment marked complete'
      });

      await fetchAssignments();
    } catch (error: any) {
      console.error('Error completing assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        variant: 'destructive'
      });
    }
  };

  const getTodayAssignments = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return assignments.filter(a => a.assignment_date === today);
  };

  const getMissedAssignments = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return assignments.filter(a => 
      a.assignment_date < today && !a.is_completed
    );
  };

  const getAssignmentsByShift = (shift: 'morning' | 'afternoon' | 'night') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return assignments.filter(a => 
      a.assignment_date === today && a.shift === shift
    );
  };

  return {
    loading,
    assignments,
    createAssignment,
    markCompleted,
    getTodayAssignments,
    getMissedAssignments,
    getAssignmentsByShift,
    refetch: fetchAssignments
  };
}
