import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface CorrectiveAction {
  id: string;
  shop_id: string;
  title: string;
  description: string | null;
  action_type: 'corrective' | 'preventive';
  source_type: string | null;
  source_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'completed' | 'verified' | 'closed';
  assigned_to: string | null;
  due_date: string | null;
  completed_date: string | null;
  verified_by: string | null;
  verified_date: string | null;
  verification_notes: string | null;
  root_cause: string | null;
  preventive_measures: string | null;
  effectiveness_review: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { first_name: string | null; last_name: string | null; email: string | null };
}

export function useCorrectiveActions() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchActions();
    }
  }, [shopId]);

  const fetchActions = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('corrective_actions')
        .select(`
          *,
          assignee:profiles!corrective_actions_assigned_to_fkey(first_name, last_name, email)
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data as any || []);
    } catch (error: any) {
      console.error('Error fetching corrective actions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load corrective actions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createAction = async (data: Partial<CorrectiveAction>) => {
    if (!shopId) return;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('corrective_actions')
        .insert([{
          title: data.title || '',
          description: data.description,
          action_type: data.action_type || 'corrective',
          priority: data.priority || 'medium',
          due_date: data.due_date,
          root_cause: data.root_cause,
          preventive_measures: data.preventive_measures,
          shop_id: shopId,
          created_by: userData.user.id
        }]);

      if (error) throw error;
      
      await fetchActions();
      toast({
        title: 'Success',
        description: 'Corrective action created'
      });
      return true;
    } catch (error: any) {
      console.error('Error creating corrective action:', error);
      toast({
        title: 'Error',
        description: 'Failed to create corrective action',
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateAction = async (id: string, data: Partial<CorrectiveAction>) => {
    try {
      const { error } = await supabase
        .from('corrective_actions')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      await fetchActions();
      toast({
        title: 'Success',
        description: 'Corrective action updated'
      });
      return true;
    } catch (error: any) {
      console.error('Error updating corrective action:', error);
      toast({
        title: 'Error',
        description: 'Failed to update corrective action',
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteAction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('corrective_actions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchActions();
      toast({
        title: 'Success',
        description: 'Corrective action deleted'
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting corrective action:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete corrective action',
        variant: 'destructive'
      });
      return false;
    }
  };

  // Get counts for dashboard
  const openCount = actions.filter(a => a.status === 'open').length;
  const overdueCount = actions.filter(a => 
    a.status !== 'closed' && 
    a.due_date && 
    new Date(a.due_date) < new Date()
  ).length;

  return {
    loading,
    actions,
    openCount,
    overdueCount,
    createAction,
    updateAction,
    deleteAction,
    refetch: fetchActions
  };
}
