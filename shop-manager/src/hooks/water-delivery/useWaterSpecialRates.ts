import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterSpecialRate {
  id: string;
  shop_id: string;
  customer_id: string;
  product_id?: string;
  rate_type: 'fixed' | 'discount_percent' | 'discount_amount';
  rate_value: number;
  minimum_quantity?: number;
  effective_date?: string;
  expiration_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  water_delivery_customers?: {
    company_name?: string;
    first_name: string;
    last_name?: string;
  };
  water_delivery_products?: {
    product_name: string;
  };
}

export function useWaterSpecialRates(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['water-special-rates', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_special_rates')
        .select(`
          *,
          water_delivery_customers (
            company_name,
            first_name,
            last_name
          ),
          water_delivery_products (
            product_name
          )
        `)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WaterSpecialRate[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (rate: Omit<WaterSpecialRate, 'id' | 'created_at' | 'updated_at' | 'water_delivery_customers' | 'water_delivery_products'>) => {
      const { data, error } = await supabase
        .from('water_delivery_special_rates')
        .insert(rate)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-special-rates', shopId] });
      toast.success('Special rate created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create rate: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterSpecialRate> & { id: string }) => {
      const { data, error } = await supabase
        .from('water_delivery_special_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-special-rates', shopId] });
      toast.success('Special rate updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update rate: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('water_delivery_special_rates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-special-rates', shopId] });
      toast.success('Special rate deleted');
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
