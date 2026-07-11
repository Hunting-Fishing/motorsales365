import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { AssetAssignment, CreateAssetAssignmentInput } from '@/types/assetAssignment';

export function useAssetAssignments() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchAssignments();
    }
  }, [shopId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('asset_assignments')
        .select(`
          *,
          profiles:employee_id(first_name, last_name, email),
          assigned_by_profile:assigned_by(first_name, last_name)
        `)
        .eq('shop_id', shopId)
        .order('assignment_start', { ascending: true });

      if (error) throw error;
      setAssignments(data as any || []); // Cast to handle type mismatch
    } catch (error: any) {
      console.error('Error fetching asset assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load asset assignments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (input: CreateAssetAssignmentInput) => {
    try {
      // shop_id and assigned_by are now auto-populated by database triggers
      const { data, error } = await supabase
        .from('asset_assignments')
        .insert([input as any])
        .select(`
          *,
          profiles:employee_id(first_name, last_name, email),
          assigned_by_profile:assigned_by(first_name, last_name)
        `)
        .single();

      if (error) throw error;
      
      await fetchAssignments();
      
      toast({
        title: 'Success',
        description: 'Asset assignment created successfully'
      });
      
      return data;
    } catch (error: any) {
      console.error('Error creating asset assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create asset assignment',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateAssignment = async (id: string, updates: Partial<AssetAssignment>) => {
    try {
      const { error } = await supabase
        .from('asset_assignments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      await fetchAssignments();
      
      toast({
        title: 'Success',
        description: 'Assignment updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating asset assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('asset_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchAssignments();
      
      toast({
        title: 'Success',
        description: 'Assignment deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting asset assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete assignment',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    loading,
    assignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    refetch: fetchAssignments
  };
}
