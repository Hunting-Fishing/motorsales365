import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeliveryZone {
  id?: string;
  shop_id: string;
  name: string;
  description?: string;
  min_distance_miles: number;
  max_distance_miles?: number;
  delivery_fee: number;
  per_mile_rate: number;
  minimum_order?: number;
  is_active: boolean;
  display_order: number;
  origin_type?: string;
  origin_id?: string;
  center_latitude?: number;
  center_longitude?: number;
  zone_color?: string;
}

export function useDeliveryZones(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-zones', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('fuel_delivery_zones')
        .select('*')
        .eq('shop_id', shopId)
        .order('display_order');
      
      if (error) throw error;
      return data as DeliveryZone[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (zone: Omit<DeliveryZone, 'id'>) => {
      const { error } = await supabase
        .from('fuel_delivery_zones')
        .insert(zone);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-zones', shopId] });
      toast.success('Delivery zone created');
    },
    onError: (error: any) => {
      console.error('Create zone error:', error);
      toast.error('Failed to create zone');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...zone }: DeliveryZone) => {
      if (!id) throw new Error('Zone ID required');
      
      const { error } = await supabase
        .from('fuel_delivery_zones')
        .update(zone)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-zones', shopId] });
      toast.success('Delivery zone updated');
    },
    onError: (error: any) => {
      console.error('Update zone error:', error);
      toast.error('Failed to update zone');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_delivery_zones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-zones', shopId] });
      toast.success('Delivery zone deleted');
    },
    onError: (error: any) => {
      console.error('Delete zone error:', error);
      toast.error('Failed to delete zone');
    },
  });

  return {
    zones: query.data || [],
    isLoading: query.isLoading,
    createZone: createMutation.mutate,
    updateZone: updateMutation.mutate,
    deleteZone: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
