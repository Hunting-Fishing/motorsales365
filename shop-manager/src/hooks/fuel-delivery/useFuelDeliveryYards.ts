import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FuelDeliveryYard {
  id?: string;
  shop_id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_primary: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useFuelDeliveryYards(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-yards', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('fuel_delivery_yards')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data as FuelDeliveryYard[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (yard: Omit<FuelDeliveryYard, 'id' | 'created_at' | 'updated_at'>) => {
      // If this is primary, unset other primaries first
      if (yard.is_primary && yard.shop_id) {
        await supabase
          .from('fuel_delivery_yards')
          .update({ is_primary: false })
          .eq('shop_id', yard.shop_id);
      }
      
      const { data, error } = await supabase
        .from('fuel_delivery_yards')
        .insert(yard)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-yards', shopId] });
      toast.success('Yard location created');
    },
    onError: (error: any) => {
      console.error('Create yard error:', error);
      toast.error('Failed to create yard location');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...yard }: FuelDeliveryYard) => {
      if (!id) throw new Error('Yard ID required');
      
      // If setting as primary, unset other primaries first
      if (yard.is_primary && yard.shop_id) {
        await supabase
          .from('fuel_delivery_yards')
          .update({ is_primary: false })
          .eq('shop_id', yard.shop_id)
          .neq('id', id);
      }
      
      const { error } = await supabase
        .from('fuel_delivery_yards')
        .update(yard)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-yards', shopId] });
      toast.success('Yard location updated');
    },
    onError: (error: any) => {
      console.error('Update yard error:', error);
      toast.error('Failed to update yard location');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_delivery_yards')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-yards', shopId] });
      toast.success('Yard location removed');
    },
    onError: (error: any) => {
      console.error('Delete yard error:', error);
      toast.error('Failed to remove yard location');
    },
  });

  return {
    yards: query.data || [],
    isLoading: query.isLoading,
    createYard: createMutation.mutate,
    updateYard: updateMutation.mutate,
    deleteYard: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
