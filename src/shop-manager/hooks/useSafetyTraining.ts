import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface TrainingCourse {
  id: string;
  shop_id: string;
  course_name: string;
  course_code: string | null;
  description: string | null;
  category: string | null;
  duration_hours: number | null;
  is_required: boolean;
  recertification_months: number | null;
  provider: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  shop_id: string;
  course_id: string;
  employee_id: string;
  assigned_by: string | null;
  assigned_date: string;
  due_date: string | null;
  completed_date: string | null;
  score: number | null;
  passed: boolean | null;
  certificate_url: string | null;
  expiry_date: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'overdue';
  notes: string | null;
  created_at: string;
  updated_at: string;
  course?: TrainingCourse;
  employee?: { first_name: string | null; last_name: string | null; email: string | null };
}

export function useSafetyTraining() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchData();
    }
  }, [shopId]);

  const fetchData = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const [coursesRes, assignmentsRes] = await Promise.all([
        supabase
          .from('training_courses')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .order('course_name'),
        supabase
          .from('training_assignments')
          .select(`
            *,
            course:training_courses(*),
            employee:profiles!training_assignments_employee_id_fkey(first_name, last_name, email)
          `)
          .eq('shop_id', shopId)
          .order('due_date', { ascending: true })
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setCourses(coursesRes.data || []);
      setAssignments(assignmentsRes.data as any || []);
    } catch (error: any) {
      console.error('Error fetching training data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load training data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (data: Partial<TrainingCourse>) => {
    if (!shopId) return;
    
    try {
      const { error } = await supabase
        .from('training_courses')
        .insert([{
          course_name: data.course_name || '',
          course_code: data.course_code,
          description: data.description,
          category: data.category,
          duration_hours: data.duration_hours,
          is_required: data.is_required,
          recertification_months: data.recertification_months,
          provider: data.provider,
          shop_id: shopId
        }]);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: 'Success',
        description: 'Training course created'
      });
      return true;
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast({
        title: 'Error',
        description: 'Failed to create course',
        variant: 'destructive'
      });
      return false;
    }
  };

  const assignTraining = async (data: Partial<TrainingAssignment>) => {
    if (!shopId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('training_assignments')
        .insert([{
          course_id: data.course_id || '',
          employee_id: data.employee_id || '',
          due_date: data.due_date,
          notes: data.notes,
          shop_id: shopId,
          assigned_by: userData?.user?.id
        }]);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: 'Success',
        description: 'Training assigned'
      });
      return true;
    } catch (error: any) {
      console.error('Error assigning training:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign training',
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateAssignment = async (id: string, data: Partial<TrainingAssignment>) => {
    try {
      const { error } = await supabase
        .from('training_assignments')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: 'Success',
        description: 'Training assignment updated'
      });
      return true;
    } catch (error: any) {
      console.error('Error updating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Stats
  const overdueCount = assignments.filter(a => 
    a.status !== 'completed' && 
    a.due_date && 
    new Date(a.due_date) < new Date()
  ).length;

  const expiringCount = assignments.filter(a => {
    if (!a.expiry_date) return false;
    const expiry = new Date(a.expiry_date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays && expiry >= new Date();
  }).length;

  const completionRate = assignments.length > 0
    ? Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100)
    : 0;

  return {
    loading,
    courses,
    assignments,
    overdueCount,
    expiringCount,
    completionRate,
    createCourse,
    assignTraining,
    updateAssignment,
    refetch: fetchData
  };
}
