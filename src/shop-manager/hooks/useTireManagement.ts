import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface TireBrand {
  id: string;
  shop_id: string;
  name: string;
  warranty_miles: number | null;
  warranty_months: number | null;
  rating: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TireInventory {
  id: string;
  shop_id: string;
  brand_id: string | null;
  brand_name: string | null;
  model: string | null;
  size: string;
  dot_code: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  vendor_name: string | null;
  status: string;
  tread_depth_initial: number | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  brand?: TireBrand;
}

export interface TireInstallation {
  id: string;
  shop_id: string;
  tire_id: string;
  equipment_id: string | null;
  vehicle_id: string | null;
  position: string;
  install_date: string;
  install_mileage: number | null;
  install_hours: number | null;
  remove_date: string | null;
  remove_mileage: number | null;
  remove_hours: number | null;
  removal_reason: string | null;
  installed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface TireInspection {
  id: string;
  shop_id: string;
  tire_id: string;
  equipment_id: string | null;
  vehicle_id: string | null;
  inspection_date: string;
  tread_depth_32nds: number | null;
  pressure_psi: number | null;
  condition: string;
  damage_type: string | null;
  damage_location: string | null;
  photo_url: string | null;
  inspector_id: string | null;
  inspector_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface TireRotation {
  id: string;
  shop_id: string;
  equipment_id: string | null;
  vehicle_id: string | null;
  rotation_date: string;
  mileage: number | null;
  hours: number | null;
  rotation_pattern: Record<string, string> | null;
  performed_by: string | null;
  work_order_id: string | null;
  notes: string | null;
  created_at: string;
}

export function useTireManagement() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();

  // Fetch tire brands
  const brandsQuery = useQuery({
    queryKey: ['tire-brands', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tire_brands')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as TireBrand[];
    },
    enabled: !!shopId,
  });

  // Fetch tire inventory
  const inventoryQuery = useQuery({
    queryKey: ['tire-inventory', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tire_inventory')
        .select(`*, brand:tire_brands(*)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TireInventory[];
    },
    enabled: !!shopId,
  });

  // Fetch installations for a specific tire or equipment
  const useTireInstallations = (tireId?: string, equipmentId?: string) => useQuery({
    queryKey: ['tire-installations', tireId, equipmentId],
    queryFn: async () => {
      let query = supabase.from('tire_installations').select('*');
      if (tireId) query = query.eq('tire_id', tireId);
      if (equipmentId) query = query.eq('equipment_id', equipmentId);
      const { data, error } = await query.order('install_date', { ascending: false });
      if (error) throw error;
      return data as TireInstallation[];
    },
    enabled: !!shopId,
  });

  // Fetch inspections
  const useTireInspections = (tireId?: string) => useQuery({
    queryKey: ['tire-inspections', tireId],
    queryFn: async () => {
      let query = supabase.from('tire_inspections').select('*');
      if (tireId) query = query.eq('tire_id', tireId);
      const { data, error } = await query.order('inspection_date', { ascending: false });
      if (error) throw error;
      return data as TireInspection[];
    },
    enabled: !!shopId,
  });

  // Fetch rotations
  const useTireRotations = (equipmentId?: string) => useQuery({
    queryKey: ['tire-rotations', equipmentId],
    queryFn: async () => {
      let query = supabase.from('tire_rotations').select('*');
      if (equipmentId) query = query.eq('equipment_id', equipmentId);
      const { data, error } = await query.order('rotation_date', { ascending: false });
      if (error) throw error;
      return data as TireRotation[];
    },
    enabled: !!shopId,
  });

  // Create tire brand
  const createBrand = useMutation({
    mutationFn: async (brand: Omit<TireBrand, 'id' | 'shop_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tire_brands')
        .insert({ ...brand, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tire-brands'] });
      toast.success('Tire brand added');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Create tire inventory
  const createTire = useMutation({
    mutationFn: async (tire: Omit<TireInventory, 'id' | 'shop_id' | 'created_at' | 'brand'>) => {
      const { data, error } = await supabase
        .from('tire_inventory')
        .insert({ ...tire, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tire-inventory'] });
      toast.success('Tire added to inventory');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Update tire
  const updateTire = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TireInventory> & { id: string }) => {
      const { data, error } = await supabase
        .from('tire_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tire-inventory'] });
      toast.success('Tire updated');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Create installation
  const createInstallation = useMutation({
    mutationFn: async (installation: Omit<TireInstallation, 'id' | 'shop_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tire_installations')
        .insert({ ...installation, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      
      // Update tire status to installed
      await supabase
        .from('tire_inventory')
        .update({ status: 'installed' })
        .eq('id', installation.tire_id);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tire-installations'] });
      queryClient.invalidateQueries({ queryKey: ['tire-inventory'] });
      toast.success('Tire installed');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Create inspection
  const createInspection = useMutation({
    mutationFn: async (inspection: Omit<TireInspection, 'id' | 'shop_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tire_inspections')
        .insert({ ...inspection, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tire-inspections'] });
      toast.success('Tire inspection recorded');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  // Create rotation
  const createRotation = useMutation({
    mutationFn: async (rotation: Omit<TireRotation, 'id' | 'shop_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tire_rotations')
        .insert({ ...rotation, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tire-rotations'] });
      toast.success('Tire rotation recorded');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  return {
    brands: brandsQuery.data || [],
    tires: inventoryQuery.data || [],
    isLoading: inventoryQuery.isLoading || brandsQuery.isLoading,
    useTireInstallations,
    useTireInspections,
    useTireRotations,
    createBrand,
    createTire,
    updateTire,
    createInstallation,
    createInspection,
    createRotation,
  };
}
