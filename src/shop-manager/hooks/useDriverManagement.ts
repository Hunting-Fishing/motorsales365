import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface DriverProfile {
  id: string;
  shop_id: string;
  staff_id: string | null;
  license_number: string | null;
  license_class: string | null;
  license_state: string | null;
  license_expiry: string | null;
  medical_card_expiry: string | null;
  endorsements: string[];
  restrictions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_birth: string | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

export interface DriverViolation {
  id: string;
  shop_id: string;
  driver_id: string;
  violation_date: string;
  violation_type: string;
  description: string | null;
  points: number;
  fine_amount: number | null;
  location: string | null;
  is_resolved: boolean;
  resolution_date: string | null;
  resolution_notes: string | null;
  document_url: string | null;
  created_at: string;
}

export interface DriverHOS {
  id: string;
  shop_id: string;
  driver_id: string;
  log_date: string;
  driving_hours: number;
  on_duty_hours: number;
  off_duty_hours: number;
  sleeper_hours: number;
  status: string;
  violation_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface DriverSafetyScore {
  id: string;
  shop_id: string;
  driver_id: string;
  period_start: string;
  period_end: string;
  overall_score: number;
  speeding_events: number;
  hard_braking_events: number;
  rapid_acceleration_events: number;
  accident_count: number;
  violation_count: number;
  miles_driven: number;
  hours_driven: number;
  notes: string | null;
  created_at: string;
}

export function useDriverManagement() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  // Fetch all driver profiles
  const driversQuery = useQuery({
    queryKey: ['driver-profiles', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          staff:profiles(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DriverProfile[];
    },
    enabled: !!shopId,
  });

  // Fetch driver violations
  const useDriverViolations = (driverId?: string) => useQuery({
    queryKey: ['driver-violations', driverId],
    queryFn: async () => {
      let query = supabase.from('driver_violations').select('*');
      if (driverId) query = query.eq('driver_id', driverId);
      const { data, error } = await query.order('violation_date', { ascending: false });
      if (error) throw error;
      return data as DriverViolation[];
    },
    enabled: !!shopId,
  });

  // Fetch HOS logs
  const useDriverHOS = (driverId?: string, startDate?: string, endDate?: string) => useQuery({
    queryKey: ['driver-hos', driverId, startDate, endDate],
    queryFn: async () => {
      let query = supabase.from('driver_hours_of_service').select('*');
      if (driverId) query = query.eq('driver_id', driverId);
      if (startDate) query = query.gte('log_date', startDate);
      if (endDate) query = query.lte('log_date', endDate);
      const { data, error } = await query.order('log_date', { ascending: false });
      if (error) throw error;
      return data as DriverHOS[];
    },
    enabled: !!shopId,
  });

  // Fetch safety scores
  const useDriverSafetyScores = (driverId?: string) => useQuery({
    queryKey: ['driver-safety-scores', driverId],
    queryFn: async () => {
      let query = supabase.from('driver_safety_scores').select('*');
      if (driverId) query = query.eq('driver_id', driverId);
      const { data, error } = await query.order('period_end', { ascending: false });
      if (error) throw error;
      return data as DriverSafetyScore[];
    },
    enabled: !!shopId,
  });

  // Create driver profile
  const createDriver = useMutation({
    mutationFn: async (driver: Omit<DriverProfile, 'id' | 'shop_id' | 'created_at' | 'updated_at' | 'staff'>) => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .insert({ ...driver, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] });
      toast.success('Driver profile created');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Update driver profile
  const updateDriver = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DriverProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('driver_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profiles'] });
      toast.success('Driver profile updated');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Create violation
  const createViolation = useMutation({
    mutationFn: async (violation: Omit<DriverViolation, 'id' | 'shop_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('driver_violations')
        .insert({ ...violation, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-violations'] });
      toast.success('Violation recorded');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Create HOS log
  const createHOSLog = useMutation({
    mutationFn: async (log: Omit<DriverHOS, 'id' | 'shop_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('driver_hours_of_service')
        .insert({ ...log, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-hos'] });
      toast.success('HOS log saved');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  return {
    drivers: driversQuery.data || [],
    isLoading: driversQuery.isLoading,
    useDriverViolations,
    useDriverHOS,
    useDriverSafetyScores,
    createDriver,
    updateDriver,
    createViolation,
    createHOSLog,
  };
}
