import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterLaborRate {
  id: string;
  shop_id: string;
  rate_name: string;
  rate_type: 'hourly' | 'per_delivery' | 'flat';
  rate_amount: number;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWaterLaborRates(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['water-labor-rates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_labor_rates')
        .select('*')
        .eq('shop_id', shopId)
        .order('rate_name');
      
      if (error) throw error;
      return data as WaterLaborRate[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (rate: Omit<WaterLaborRate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('water_delivery_labor_rates')
        .insert(rate)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-labor-rates', shopId] });
      toast.success('Labor rate created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create rate: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterLaborRate> & { id: string }) => {
      const { data, error } = await supabase
        .from('water_delivery_labor_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-labor-rates', shopId] });
      toast.success('Labor rate updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rate: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('water_delivery_labor_rates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-labor-rates', shopId] });
      toast.success('Labor rate deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete rate: ${error.message}`);
    },
  });

  return {
    rates: query.data || [],
    isLoading: query.isLoading,
    createRate: createMutation.mutate,
    updateRate: updateMutation.mutate,
    deleteRate: deleteMutation.mutate,
  };
}
