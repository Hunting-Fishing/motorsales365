import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterDeliveryZone {
  id: string;
  shop_id: string;
  zone_name: string;
  zone_code?: string;
  description?: string;
  delivery_fee: number;
  minimum_order?: number;
  zip_codes?: string[];
  cities?: string[];
  polygon_coordinates?: any;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useWaterDeliveryZones(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['water-delivery-zones', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_zones')
        .select('*')
        .eq('shop_id', shopId)
        .order('zone_name');
      
      if (error) throw error;
      return data as WaterDeliveryZone[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (zone: Omit<WaterDeliveryZone, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('water_delivery_zones')
        .insert(zone)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-zones', shopId] });
      toast.success('Delivery zone created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create zone: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterDeliveryZone> & { id: string }) => {
      const { data, error } = await supabase
        .from('water_delivery_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-zones', shopId] });
      toast.success('Delivery zone updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update zone: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('water_delivery_zones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-zones', shopId] });
      toast.success('Delivery zone deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete zone: ${error.message}`);
    },
  });

  return {
    zones: query.data || [],
    isLoading: query.isLoading,
    createZone: createMutation.mutate,
    updateZone: updateMutation.mutate,
    deleteZone: deleteMutation.mutate,
  };
}
