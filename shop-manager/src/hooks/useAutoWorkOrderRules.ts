import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';

export interface WorkOrderRule {
  id: string;
  shop_id: string;
  inspection_type: string;
  trigger_status: string;
  auto_create_work_order: boolean;
  work_order_priority: string;
  assign_to_role?: string;
  include_photos: boolean;
  notes_template?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleData {
  inspection_type: string;
  trigger_status: string;
  auto_create_work_order?: boolean;
  work_order_priority?: string;
  assign_to_role?: string;
  include_photos?: boolean;
  notes_template?: string;
}

export function useAutoWorkOrderRules() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<WorkOrderRule[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchRules();
    }
  }, [shopId]);

  const fetchRules = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('inspection_work_order_rules' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      setRules((data || []) as WorkOrderRule[]);
    } catch (error: any) {
      console.error('Error fetching work order rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load work order rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createRule = async (data: CreateRuleData) => {
    if (!shopId) return null;
    
    try {
      const { data: rule, error } = await (supabase
        .from('inspection_work_order_rules' as any)
        .insert({
          shop_id: shopId,
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchRules();
      toast({
        title: 'Success',
        description: 'Work order rule created'
      });
      
      return rule;
    } catch (error: any) {
      console.error('Error creating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create rule',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateRule = async (id: string, updates: Partial<CreateRuleData & { is_active: boolean }>) => {
    try {
      const { error } = await (supabase
        .from('inspection_work_order_rules' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id) as any);

      if (error) throw error;
      
      await fetchRules();
      toast({ title: 'Rule updated' });
    } catch (error: any) {
      console.error('Error updating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule',
        variant: 'destructive'
      });
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await (supabase
        .from('inspection_work_order_rules' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;
      
      await fetchRules();
      toast({ title: 'Rule deleted' });
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    rules,
    createRule,
    updateRule,
    deleteRule,
    refetch: fetchRules
  };
}
