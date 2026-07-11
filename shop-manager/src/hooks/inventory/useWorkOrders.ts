import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface WorkOrder {
  id: string;
  asset_id: string;
  service_package_id?: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date?: string;
  completed_date?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkOrderInput {
  asset_id: string;
  service_package_id?: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date?: string;
  assigned_to?: string;
}

export function useWorkOrders() {
  const queryClient = useQueryClient();

  const {
    data: workOrders = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['asset-work-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_work_orders')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data as WorkOrder[];
    },
  });

  const createWorkOrder = useMutation({
    mutationFn: async (input: CreateWorkOrderInput) => {
      const { data, error } = await supabase
        .from('asset_work_orders')
        .insert({
          ...input,
          status: 'scheduled',
          priority: input.priority || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-work-orders'] });
      toast({
        title: "Work Order Created",
        description: "Work order has been created successfully.",
      });
    },
    onError: (error) => {
      console.error('Error creating work order:', error);
      toast({
        title: "Error",
        description: "Failed to create work order.",
        variant: "destructive",
      });
    }
  });

  const updateWorkOrder = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkOrder> }) => {
      const { data, error } = await supabase
        .from('asset_work_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-work-orders'] });
      toast({
        title: "Work Order Updated",
        description: "Work order has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating work order:', error);
      toast({
        title: "Error",
        description: "Failed to update work order.",
        variant: "destructive",
      });
    }
  });

  const completeWorkOrder = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('asset_work_orders')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-work-orders'] });
      toast({
        title: "Work Order Completed",
        description: "Parts have been deducted from inventory.",
      });
    },
    onError: (error) => {
      console.error('Error completing work order:', error);
      toast({
        title: "Error",
        description: "Failed to complete work order.",
        variant: "destructive",
      });
    }
  });

  const deleteWorkOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_work_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-work-orders'] });
      toast({
        title: "Work Order Deleted",
        description: "Work order has been removed successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting work order:', error);
      toast({
        title: "Error",
        description: "Failed to delete work order.",
        variant: "destructive",
      });
    }
  });

  return {
    workOrders,
    isLoading,
    createWorkOrder: createWorkOrder.mutateAsync,
    updateWorkOrder: updateWorkOrder.mutateAsync,
    completeWorkOrder: completeWorkOrder.mutateAsync,
    deleteWorkOrder: deleteWorkOrder.mutateAsync,
    refetch
  };
}
