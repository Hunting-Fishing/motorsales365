import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface PackagingOption {
  id: string;
  shop_id: string;
  name: string;
  packaging_type: string;
  size_label: string | null;
  weight_capacity_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  volume_cm3: number | null;
  tare_weight_kg: number | null;
  material: string | null;
  material_cost_per_unit: number;
  labor_cost_per_unit: number;
  total_cost_per_unit: number;
  manufacturer_name: string | null;
  manufacturer_country: string | null;
  manufacturer_contact: string | null;
  manufacturer_lead_time_days: number | null;
  shipping_cost_to_warehouse: number;
  last_order_date: string | null;
  last_order_qty: number | null;
  last_unit_price: number | null;
  current_stock: number;
  reorder_point: number;
  preferred_supplier: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PackagingShipment {
  id: string;
  shop_id: string;
  packaging_id: string;
  shipment_date: string;
  expected_arrival: string | null;
  actual_arrival: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  shipping_cost: number;
  supplier_name: string | null;
  supplier_country: string | null;
  tracking_number: string | null;
  status: string;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
}

export function useExportPackagingOptions() {
  const { shopId } = useShopId();
  return useQuery({
    queryKey: ['export-packaging-options', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('export_packaging_options')
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as PackagingOption[];
    },
    enabled: !!shopId,
  });
}

export function useCreatePackagingOption() {
  const qc = useQueryClient();
  const { shopId } = useShopId();
  return useMutation({
    mutationFn: async (data: Partial<PackagingOption>) => {
      if (!shopId) throw new Error('No shop');
      const payload = { ...data, shop_id: shopId } as any;
      const { data: result, error } = await supabase
        .from('export_packaging_options')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['export-packaging-options'] }); toast.success('Packaging created'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePackagingOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PackagingOption> & { id: string }) => {
      const { error } = await supabase.from('export_packaging_options').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['export-packaging-options'] }); toast.success('Packaging updated'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePackagingOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('export_packaging_options').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['export-packaging-options'] }); toast.success('Packaging removed'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePackagingShipments(packagingId?: string) {
  const { shopId } = useShopId();
  return useQuery({
    queryKey: ['export-packaging-shipments', shopId, packagingId],
    queryFn: async () => {
      if (!shopId) return [];
      let q = supabase.from('export_packaging_shipments').select('*').eq('shop_id', shopId).order('shipment_date', { ascending: false });
      if (packagingId) q = q.eq('packaging_id', packagingId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PackagingShipment[];
    },
    enabled: !!shopId,
  });
}

export function useCreatePackagingShipment() {
  const qc = useQueryClient();
  const { shopId } = useShopId();
  return useMutation({
    mutationFn: async (data: Partial<PackagingShipment>) => {
      if (!shopId) throw new Error('No shop');
      const payload = { ...data, shop_id: shopId } as any;
      const { data: result, error } = await supabase
        .from('export_packaging_shipments')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['export-packaging-shipments'] });
      qc.invalidateQueries({ queryKey: ['export-packaging-options'] });
      toast.success('Shipment recorded');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
