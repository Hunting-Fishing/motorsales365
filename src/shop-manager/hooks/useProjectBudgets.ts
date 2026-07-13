import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectBudget, ProjectPhase, ProjectCostItem, ProjectChangeOrder, ProjectBudgetSnapshot } from '@/types/projectBudget';

export function useProjectBudgets() {
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['project-budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectBudget[];
    },
  });

  const createProject = useMutation({
    mutationFn: async (project: Partial<ProjectBudget>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('project_budgets')
        .insert({
          project_name: project.project_name || '',
          original_budget: project.original_budget || 0,
          description: project.description,
          project_type: project.project_type,
          priority: project.priority,
          contingency_amount: project.contingency_amount,
          contingency_percent: project.contingency_percent,
          current_budget: project.current_budget || project.original_budget,
          planned_start_date: project.planned_start_date,
          planned_end_date: project.planned_end_date,
          requires_approval: project.requires_approval,
          approval_threshold: project.approval_threshold,
          shop_id: profile?.shop_id || '',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Project created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectBudget> }) => {
      const { data, error } = await supabase
        .from('project_budgets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Project updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update project: ${error.message}`);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  const approveProject = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('project_budgets')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approved_budget: supabase.rpc ? undefined : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Update approved_budget to match current_budget
      const { error: updateError } = await supabase
        .from('project_budgets')
        .update({ approved_budget: data.current_budget })
        .eq('id', id);

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast.success('Project approved');
    },
    onError: (error: any) => {
      toast.error(`Failed to approve project: ${error.message}`);
    },
  });

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
    approveProject,
  };
}

export function useProjectDetails(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as ProjectBudget;
    },
    enabled: !!projectId,
  });

  const { data: phases } = useQuery({
    queryKey: ['project-phases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_order', { ascending: true });

      if (error) throw error;
      return data as ProjectPhase[];
    },
    enabled: !!projectId,
  });

  const { data: costItems } = useQuery({
    queryKey: ['project-cost-items', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_cost_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProjectCostItem[];
    },
    enabled: !!projectId,
  });

  const { data: changeOrders } = useQuery({
    queryKey: ['project-change-orders', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_change_orders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProjectChangeOrder[];
    },
    enabled: !!projectId,
  });

  const { data: snapshots } = useQuery({
    queryKey: ['project-snapshots', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_budget_snapshots')
        .select('*')
        .eq('project_id', projectId)
        .order('snapshot_date', { ascending: false });

      if (error) throw error;
      return data as ProjectBudgetSnapshot[];
    },
    enabled: !!projectId,
  });

  // Phase mutations
  const createPhase = useMutation({
    mutationFn: async (phase: Partial<ProjectPhase>) => {
      const { data, error } = await supabase
        .from('project_phases')
        .insert({
          project_id: projectId,
          phase_name: phase.phase_name || '',
          phase_order: phase.phase_order,
          description: phase.description,
          phase_budget: phase.phase_budget,
          planned_start: phase.planned_start,
          planned_end: phase.planned_end,
          depends_on_phase_id: phase.depends_on_phase_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('Phase created');
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectPhase> }) => {
      const { data, error } = await supabase
        .from('project_phases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('Phase updated');
    },
  });

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
      toast.success('Phase deleted');
    },
  });

  // Cost item mutations
  const createCostItem = useMutation({
    mutationFn: async (item: Partial<ProjectCostItem>) => {
      const { data, error } = await supabase
        .from('project_cost_items')
        .insert({
          project_id: projectId,
          category: item.category || '',
          description: item.description,
          phase_id: item.phase_id,
          budgeted_amount: item.budgeted_amount,
          committed_amount: item.committed_amount,
          actual_spent: item.actual_spent,
          purchase_order_number: item.purchase_order_number,
          notes: item.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-cost-items', projectId] });
      toast.success('Cost item added');
    },
  });

  const updateCostItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectCostItem> }) => {
      const { data, error } = await supabase
        .from('project_cost_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-cost-items', projectId] });
      toast.success('Cost item updated');
    },
  });

  const deleteCostItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_cost_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-cost-items', projectId] });
      toast.success('Cost item deleted');
    },
  });

  // Change order mutations
  const createChangeOrder = useMutation({
    mutationFn: async (changeOrder: Partial<ProjectChangeOrder>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('project_change_orders')
        .insert({
          project_id: projectId,
          reason: changeOrder.reason || '',
          description: changeOrder.description,
          amount_change: changeOrder.amount_change || 0,
          requested_by: user?.id,
          original_budget: project?.current_budget,
          new_budget: (project?.current_budget || 0) + (changeOrder.amount_change || 0),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-orders', projectId] });
      toast.success('Change order created');
    },
  });

  const approveChangeOrder = useMutation({
    mutationFn: async (changeOrderId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the change order
      const { data: changeOrder } = await supabase
        .from('project_change_orders')
        .select('*')
        .eq('id', changeOrderId)
        .single();

      if (!changeOrder) throw new Error('Change order not found');

      // Update change order status
      const { error: coError } = await supabase
        .from('project_change_orders')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', changeOrderId);

      if (coError) throw coError;

      // Update project budget
      const { error: pbError } = await supabase
        .from('project_budgets')
        .update({
          current_budget: changeOrder.new_budget,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (pbError) throw pbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-orders', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
      toast.success('Change order approved');
    },
  });

  const rejectChangeOrder = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('project_change_orders')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-change-orders', projectId] });
      toast.success('Change order rejected');
    },
  });

  // Snapshot mutations
  const createSnapshot = useMutation({
    mutationFn: async ({ snapshot_type, notes }: { snapshot_type: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Capture current phase data
      const phaseData = phases?.map(p => ({
        id: p.id,
        name: p.phase_name,
        budget: p.phase_budget,
        spent: p.actual_spent,
        percent_complete: p.percent_complete,
        status: p.status,
      }));

      const { data, error } = await supabase
        .from('project_budget_snapshots')
        .insert({
          project_id: projectId,
          snapshot_date: new Date().toISOString(),
          snapshot_type,
          total_budget: project?.current_budget || project?.original_budget,
          total_committed: project?.committed_amount,
          total_spent: project?.actual_spent,
          forecasted_total: project?.forecasted_total,
          phase_data: phaseData,
          notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-snapshots', projectId] });
      toast.success('Budget snapshot created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create snapshot: ${error.message}`);
    },
  });

  return {
    project,
    phases,
    costItems,
    changeOrders,
    snapshots,
    isLoading,
    createPhase,
    updatePhase,
    deletePhase,
    createCostItem,
    updateCostItem,
    deleteCostItem,
    createChangeOrder,
    approveChangeOrder,
    rejectChangeOrder,
    createSnapshot,
  };
}
