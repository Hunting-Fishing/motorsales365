import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface WaterDeliveryTruck {
  id: string;
  shop_id: string;
  truck_number: string;
  license_plate?: string | null;
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  status?: string | null;
  current_odometer?: number | null;
  tank_capacity_gallons?: number | null;
  tank_material?: string | null;
  compartments?: number | null;
  compartment_capacities?: Json | null;
  current_water_load?: number | null;
  is_potable_certified?: boolean | null;
  meter_number?: string | null;
  insurance_expiry?: string | null;
  registration_expiry?: string | null;
  dot_inspection_due?: string | null;
  nfs_certification_expiry?: string | null;
  last_sanitized_date?: string | null;
  next_sanitization_due?: string | null;
  sanitization_certificate_url?: string | null;
  last_calibration_date?: string | null;
  next_calibration_due?: string | null;
  notes?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at: string;
}

export type WaterDeliveryTruckInsert = Omit<WaterDeliveryTruck, 'id' | 'created_at' | 'updated_at'>;
export type WaterDeliveryTruckUpdate = Partial<WaterDeliveryTruckInsert> & { id: string };

export function useWaterDeliveryTrucks(shopId: string | null) {
  return useQuery({
    queryKey: ['water-delivery-trucks', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_trucks')
        .select('*')
        .eq('shop_id', shopId)
        .order('truck_number', { ascending: true });
      if (error) throw error;
      return data as WaterDeliveryTruck[];
    },
    enabled: !!shopId,
  });
}

export function useCreateWaterDeliveryTruck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (truck: WaterDeliveryTruckInsert) => {
      const { data, error } = await supabase
        .from('water_delivery_trucks')
        .insert(truck)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks', variables.shop_id] });
      toast.success('Truck created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create truck: ${error.message}`);
    },
  });
}

export function useUpdateWaterDeliveryTruck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: WaterDeliveryTruckUpdate) => {
      const { data, error } = await supabase
        .from('water_delivery_trucks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks', data.shop_id] });
      toast.success('Truck updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update truck: ${error.message}`);
    },
  });
}

export function useDeleteWaterDeliveryTruck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, shopId }: { id: string; shopId: string }) => {
      const { error } = await supabase
        .from('water_delivery_trucks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { id, shopId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-trucks', variables.shopId] });
      toast.success('Truck deleted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete truck: ${error.message}`);
    },
  });
}

// Helper to get expiration status
export function getExpirationStatus(dateString: string | null | undefined): 'expired' | 'expiring' | 'valid' | 'unknown' {
  if (!dateString) return 'unknown';
  const date = new Date(dateString);
  const now = new Date();
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring';
  return 'valid';
}

// Get the next due date from all compliance dates
export function getNextDueDate(truck: WaterDeliveryTruck): { date: string | null; label: string; status: 'expired' | 'expiring' | 'valid' | 'unknown' } {
  const dates = [
    { date: truck.insurance_expiry, label: 'Insurance' },
    { date: truck.registration_expiry, label: 'Registration' },
    { date: truck.dot_inspection_due, label: 'DOT Inspection' },
    { date: truck.nfs_certification_expiry, label: 'NSF Cert' },
    { date: truck.next_sanitization_due, label: 'Sanitization' },
    { date: truck.next_calibration_due, label: 'Calibration' },
  ].filter(d => d.date);

  if (dates.length === 0) return { date: null, label: 'None', status: 'unknown' };

  const sorted = dates.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  const next = sorted[0];
  
  return {
    date: next.date!,
    label: next.label,
    status: getExpirationStatus(next.date),
  };
}

// Get compliance summary for a truck
export function getTruckComplianceAlerts(truck: WaterDeliveryTruck): { label: string; status: 'expired' | 'expiring' | 'valid' | 'unknown'; date: string | null }[] {
  return [
    { label: 'Insurance', date: truck.insurance_expiry ?? null, status: getExpirationStatus(truck.insurance_expiry) },
    { label: 'Registration', date: truck.registration_expiry ?? null, status: getExpirationStatus(truck.registration_expiry) },
    { label: 'DOT Inspection', date: truck.dot_inspection_due ?? null, status: getExpirationStatus(truck.dot_inspection_due) },
    { label: 'NSF Certification', date: truck.nfs_certification_expiry ?? null, status: getExpirationStatus(truck.nfs_certification_expiry) },
    { label: 'Sanitization', date: truck.next_sanitization_due ?? null, status: getExpirationStatus(truck.next_sanitization_due) },
    { label: 'Meter Calibration', date: truck.next_calibration_due ?? null, status: getExpirationStatus(truck.next_calibration_due) },
  ];
}
