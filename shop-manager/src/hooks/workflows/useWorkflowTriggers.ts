import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTrigger {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: any;
  is_active: boolean;
  shop_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useWorkflowTriggers() {
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTriggers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('workflow_triggers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTriggers(data || []);
    } catch (error) {
      console.error('Error fetching workflow triggers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow triggers',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTrigger = async (triggerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('workflow_triggers')
        .update({ is_active: isActive })
        .eq('id', triggerId);

      if (error) throw error;

      setTriggers(prev => 
        prev.map(trigger => 
          trigger.id === triggerId 
            ? { ...trigger, is_active: isActive }
            : trigger
        )
      );

      toast({
        title: 'Success',
        description: `Workflow ${isActive ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error toggling workflow trigger:', error);
      toast({
        title: 'Error',
        description: 'Failed to update workflow status',
        variant: 'destructive'
      });
    }
  };

  const deleteTrigger = async (triggerId: string) => {
    try {
      const { error } = await supabase
        .from('workflow_triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;

      setTriggers(prev => prev.filter(trigger => trigger.id !== triggerId));

      toast({
        title: 'Success',
        description: 'Workflow deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting workflow trigger:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workflow',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchTriggers();
  }, []);

  return {
    triggers,
    isLoading,
    toggleTrigger,
    deleteTrigger,
    refetch: fetchTriggers
  };
}