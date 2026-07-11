import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SpecialRate {
  id?: string;
  shop_id: string;
  name: string;
  rate_type: 'flat' | 'percentage' | 'per_gallon';
  rate_value: number;
  applies_to: string[];
  start_time?: string;
  end_time?: string;
  days_of_week?: number[];
  is_active: boolean;
}

export const RATE_CATEGORIES = [
  { value: 'after_hours', label: 'After Hours' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'emergency', label: 'Emergency/Rush' },
  { value: 'same_day', label: 'Same Day' },
  { value: 'night', label: 'Night Delivery' },
];

export function useSpecialRates(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-special-rates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('fuel_delivery_special_rates')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');
      
      if (error) throw error;
      return data as SpecialRate[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (rate: Omit<SpecialRate, 'id'>) => {
      const { error } = await supabase
        .from('fuel_delivery_special_rates')
        .insert(rate);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-special-rates', shopId] });
      toast.success('Special rate created');
    },
    onError: (error: any) => {
      console.error('Create rate error:', error);
      toast.error('Failed to create rate');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rate }: SpecialRate) => {
      if (!id) throw new Error('Rate ID required');
      
      const { error } = await supabase
        .from('fuel_delivery_special_rates')
        .update(rate)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-special-rates', shopId] });
      toast.success('Special rate updated');
    },
    onError: (error: any) => {
      console.error('Update rate error:', error);
      toast.error('Failed to update rate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_delivery_special_rates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-special-rates', shopId] });
      toast.success('Special rate deleted');
    },
    onError: (error: any) => {
      console.error('Delete rate error:', error);
      toast.error('Failed to delete rate');
    },
  });

  return {
    rates: query.data || [],
    isLoading: query.isLoading,
    createRate: createMutation.mutate,
    updateRate: updateMutation.mutate,
    deleteRate: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
