import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EscalationRule {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  trigger_condition: string;
  trigger_config: any;
  escalation_steps: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useEscalationRules() {
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEscalationRules = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('escalation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEscalationRules(data || []);
    } catch (error) {
      console.error('Error fetching escalation rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load escalation rules',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createEscalationRule = async (ruleData: Partial<Omit<EscalationRule, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'shop_id'>> & { name: string; trigger_condition: string; shop_id?: string }) => {
    try {
      const user = await supabase.auth.getUser();
      const profile = await supabase.from('profiles').select('shop_id').single();
      
      const { data, error } = await supabase
        .from('escalation_rules')
        .insert({
          ...ruleData,
          is_active: ruleData.is_active ?? true,
          created_by: user.data.user?.id || '',
          shop_id: ruleData.shop_id || profile.data?.shop_id || ''
        })
        .select()
        .single();

      if (error) throw error;

      setEscalationRules(prev => [data, ...prev]);
      toast({
        title: 'Success',
        description: 'Escalation rule created successfully'
      });
      return data;
    } catch (error) {
      console.error('Error creating escalation rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create escalation rule',
        variant: 'destructive'
      });
    }
  };

  const updateEscalationRule = async (id: string, updates: Partial<EscalationRule>) => {
    try {
      const { data, error } = await supabase
        .from('escalation_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEscalationRules(prev => 
        prev.map(rule => rule.id === id ? { ...rule, ...data } : rule)
      );

      toast({
        title: 'Success',
        description: 'Escalation rule updated successfully'
      });
      return data;
    } catch (error) {
      console.error('Error updating escalation rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update escalation rule',
        variant: 'destructive'
      });
    }
  };

  const toggleEscalationRule = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('escalation_rules')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setEscalationRules(prev => 
        prev.map(rule => 
          rule.id === id ? { ...rule, is_active: isActive } : rule
        )
      );

      toast({
        title: 'Success',
        description: `Escalation rule ${isActive ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling escalation rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update escalation rule status',
        variant: 'destructive'
      });
    }
  };

  const deleteEscalationRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('escalation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEscalationRules(prev => prev.filter(rule => rule.id !== id));

      toast({
        title: 'Success',
        description: 'Escalation rule deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting escalation rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete escalation rule',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchEscalationRules();
  }, []);

  return {
    escalationRules,
    isLoading,
    createEscalationRule,
    updateEscalationRule,
    toggleEscalationRule,
    deleteEscalationRule,
    refetch: fetchEscalationRules
  };
}