import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaborRate {
  id?: string;
  shop_id: string;
  name: string;
  description?: string;
  hourly_rate: number;
  is_default: boolean;
  is_active: boolean;
}

export function useLaborRates(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-labor-rates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('fuel_delivery_labor_rates')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');
      
      if (error) throw error;
      return data as LaborRate[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (rate: Omit<LaborRate, 'id'>) => {
      const { error } = await supabase
        .from('fuel_delivery_labor_rates')
        .insert(rate);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-labor-rates', shopId] });
      toast.success('Labor rate created');
    },
    onError: (error: any) => {
      console.error('Create labor rate error:', error);
      toast.error('Failed to create labor rate');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rate }: LaborRate) => {
      if (!id) throw new Error('Rate ID required');
      
      const { error } = await supabase
        .from('fuel_delivery_labor_rates')
        .update(rate)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-labor-rates', shopId] });
      toast.success('Labor rate updated');
    },
    onError: (error: any) => {
      console.error('Update labor rate error:', error);
      toast.error('Failed to update labor rate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_delivery_labor_rates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-labor-rates', shopId] });
      toast.success('Labor rate deleted');
    },
    onError: (error: any) => {
      console.error('Delete labor rate error:', error);
      toast.error('Failed to delete labor rate');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from('fuel_delivery_labor_rates')
        .update({ is_default: false })
        .eq('shop_id', shopId!);
      
      // Then set the new default
      const { error } = await supabase
        .from('fuel_delivery_labor_rates')
        .update({ is_default: true })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-labor-rates', shopId] });
      toast.success('Default rate updated');
    },
    onError: (error: any) => {
      console.error('Set default error:', error);
      toast.error('Failed to set default rate');
    },
  });

  return {
    rates: query.data || [],
    isLoading: query.isLoading,
    createRate: createMutation.mutate,
    updateRate: updateMutation.mutate,
    deleteRate: deleteMutation.mutate,
    setDefaultRate: setDefaultMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
