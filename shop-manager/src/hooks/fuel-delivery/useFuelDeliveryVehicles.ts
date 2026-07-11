import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FuelDeliveryVehicle {
  id?: string;
  shop_id: string;
  yard_id?: string;
  name: string;
  license_plate?: string;
  vehicle_type: string;
  fuel_capacity_gallons?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useFuelDeliveryVehicles(shopId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['fuel-delivery-vehicles', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('fuel_delivery_vehicles')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as FuelDeliveryVehicle[];
    },
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: async (vehicle: Omit<FuelDeliveryVehicle, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('fuel_delivery_vehicles')
        .insert(vehicle)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-vehicles', shopId] });
      toast.success('Vehicle added');
    },
    onError: (error: any) => {
      console.error('Create vehicle error:', error);
      toast.error('Failed to add vehicle');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...vehicle }: FuelDeliveryVehicle) => {
      if (!id) throw new Error('Vehicle ID required');
      
      const { error } = await supabase
        .from('fuel_delivery_vehicles')
        .update(vehicle)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-vehicles', shopId] });
      toast.success('Vehicle updated');
    },
    onError: (error: any) => {
      console.error('Update vehicle error:', error);
      toast.error('Failed to update vehicle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fuel_delivery_vehicles')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-vehicles', shopId] });
      toast.success('Vehicle removed');
    },
    onError: (error: any) => {
      console.error('Delete vehicle error:', error);
      toast.error('Failed to remove vehicle');
    },
  });

  return {
    vehicles: query.data || [],
    isLoading: query.isLoading,
    createVehicle: createMutation.mutate,
    updateVehicle: updateMutation.mutate,
    deleteVehicle: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
