import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WaterTruckTank {
  id: string;
  shop_id: string;
  truck_id: string;
  tank_number: number;
  tank_name: string | null;
  capacity_gallons: number;
  current_level_gallons: number;
  material: string | null;
  is_potable_certified: boolean | null;
  last_sanitized_date: string | null;
  next_sanitization_due: string | null;
  last_fill_date: string | null;
  last_fill_source: string | null;
  notes: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export type WaterTruckTankInsert = Omit<WaterTruckTank, 'id' | 'created_at' | 'updated_at'>;
export type WaterTruckTankUpdate = Partial<WaterTruckTankInsert> & { id: string };

export function useWaterTruckTanks(truckId: string | undefined) {
  return useQuery({
    queryKey: ['water-truck-tanks', truckId],
    queryFn: async () => {
      if (!truckId) return [];
      
      const { data, error } = await supabase
        .from('water_delivery_truck_tanks')
        .select('*')
        .eq('truck_id', truckId)
        .order('tank_number', { ascending: true });
      
      if (error) throw error;
      return data as WaterTruckTank[];
    },
    enabled: !!truckId
  });
}

export function useCreateWaterTruckTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tank: WaterTruckTankInsert) => {
      const { data, error } = await supabase
        .from('water_delivery_truck_tanks')
        .insert(tank)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['water-truck-tanks', data.truck_id] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks'] });
      toast.success('Tank added successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to add tank: ${error.message}`);
    },
  });
}

export function useUpdateWaterTruckTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: WaterTruckTankUpdate) => {
      const { data, error } = await supabase
        .from('water_delivery_truck_tanks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['water-truck-tanks', data.truck_id] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks'] });
      toast.success('Tank updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update tank: ${error.message}`);
    },
  });
}

export function useDeleteWaterTruckTank() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, truckId }: { id: string; truckId: string }) => {
      const { error } = await supabase
        .from('water_delivery_truck_tanks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, truckId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['water-truck-tanks', variables.truckId] });
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks'] });
      toast.success('Tank deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete tank: ${error.message}`);
    },
  });
}

// Get next tank number for a truck
export function useNextTankNumber(truckId: string | undefined) {
  return useQuery({
    queryKey: ['water-truck-tanks-next-number', truckId],
    queryFn: async () => {
      if (!truckId) return 1;
      
      const { data, error } = await supabase
        .from('water_delivery_truck_tanks')
        .select('tank_number')
        .eq('truck_id', truckId)
        .order('tank_number', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0 ? data[0].tank_number + 1 : 1;
    },
    enabled: !!truckId
  });
}
