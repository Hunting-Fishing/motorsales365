import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterDeliveryVehicle {
  id: string;
  shop_id: string;
  vehicle_type: string;
  vehicle_number: string;
  license_plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  status: string;
  current_odometer?: number;
  insurance_expiry?: string;
  registration_expiry?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useWaterDeliveryVehicles(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['water-delivery-vehicles', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_vehicles')
        .select('*')
        .eq('shop_id', shopId)
        .order('vehicle_number');
      
      if (error) throw error;
      return data as WaterDeliveryVehicle[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (vehicle: Omit<WaterDeliveryVehicle, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('water_delivery_vehicles')
        .insert(vehicle)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-vehicles', shopId] });
      toast.success('Vehicle created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create vehicle: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaterDeliveryVehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from('water_delivery_vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-vehicles', shopId] });
      toast.success('Vehicle updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update vehicle: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('water_delivery_vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-vehicles', shopId] });
      toast.success('Vehicle deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete vehicle: ${error.message}`);
    },
  });

  return {
    vehicles: query.data || [],
    isLoading: query.isLoading,
    createVehicle: createMutation.mutate,
    updateVehicle: updateMutation.mutate,
    deleteVehicle: deleteMutation.mutate,
  };
}
