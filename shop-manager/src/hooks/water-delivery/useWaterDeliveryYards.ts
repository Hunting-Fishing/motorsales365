import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterDeliveryYard {
  id: string;
  shop_id: string;
  yard_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  contact_name?: string;
  contact_phone?: string;
  is_primary: boolean;
  is_active: boolean;
  water_source_type?: string;
  treatment_capabilities?: string[];
  storage_capacity_gallons?: number;
  daily_capacity_gallons?: number;
  certifications?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useWaterDeliveryYards(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['water-delivery-yards', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_yards')
        .select('*')
        .eq('shop_id', shopId)
        .order('yard_name');
      
      if (error) throw error;
      return data as WaterDeliveryYard[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (yard: Omit<WaterDeliveryYard, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('water_delivery_yards')
        .insert(yard)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-yards', shopId] });
      toast.success('Water yard created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create yard: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterDeliveryYard> & { id: string }) => {
      const { data, error } = await supabase
        .from('water_delivery_yards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-yards', shopId] });
      toast.success('Water yard updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update yard: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('water_delivery_yards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-yards', shopId] });
      toast.success('Water yard deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete yard: ${error.message}`);
    },
  });

  return {
    yards: query.data || [],
    isLoading: query.isLoading,
    createYard: createMutation.mutate,
    updateYard: updateMutation.mutate,
    deleteYard: deleteMutation.mutate,
  };
}
