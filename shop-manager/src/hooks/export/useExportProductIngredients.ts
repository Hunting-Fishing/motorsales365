import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface ExportProductIngredient {
  id: string;
  shop_id: string;
  product_id: string;
  ingredient_name: string;
  percentage: number | null;
  cost_per_unit: number;
  unit_of_measure: string;
  supplier_name: string | null;
  supplier_country: string | null;
  supplier_contact: string | null;
  country_of_origin: string | null;
  grade: string | null;
  is_allergen: boolean;
  is_organic: boolean;
  cas_number: string | null;
  last_shipment_date: string | null;
  last_shipment_qty: number | null;
  last_shipment_cost: number | null;
  avg_lead_time_days: number | null;
  current_stock: number;
  reorder_level: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExportIngredientShipment {
  id: string;
  shop_id: string;
  ingredient_id: string;
  shipment_date: string;
  quantity: number;
  unit_cost: number;
  total_cost: number | null;
  shipping_cost: number;
  supplier_name: string | null;
  manufacturer_name: string | null;
  manufacturer_country: string | null;
  tracking_number: string | null;
  batch_number: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  quality_grade: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export function useExportProductIngredients(productId: string | null) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['export-product-ingredients', productId],
    queryFn: async () => {
      if (!shopId || !productId) return [];
      const { data, error } = await supabase
        .from('export_product_ingredients')
        .select('*')
        .eq('product_id', productId)
        .eq('shop_id', shopId)
        .order('ingredient_name');
      if (error) throw error;
      return data as ExportProductIngredient[];
    },
    enabled: !!shopId && !!productId,
  });
}

export function useCreateExportIngredient() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: Partial<ExportProductIngredient> & { product_id: string; ingredient_name: string }) => {
      if (!shopId) throw new Error('No shop selected');
      const { data: result, error } = await supabase
        .from('export_product_ingredients')
        .insert({ ...data, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-product-ingredients', vars.product_id] });
      toast.success('Ingredient added');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useUpdateExportIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId, ...data }: Partial<ExportProductIngredient> & { id: string; productId: string }) => {
      const { error } = await supabase
        .from('export_product_ingredients')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-product-ingredients', vars.productId] });
      toast.success('Ingredient updated');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useDeleteExportIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('export_product_ingredients')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-product-ingredients', vars.productId] });
      toast.success('Ingredient removed');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useIngredientShipments(ingredientId: string | null) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['export-ingredient-shipments', ingredientId],
    queryFn: async () => {
      if (!shopId || !ingredientId) return [];
      const { data, error } = await supabase
        .from('export_ingredient_shipments')
        .select('*')
        .eq('ingredient_id', ingredientId)
        .eq('shop_id', shopId)
        .order('shipment_date', { ascending: false });
      if (error) throw error;
      return data as ExportIngredientShipment[];
    },
    enabled: !!shopId && !!ingredientId,
  });
}

export function useCreateIngredientShipment() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: Partial<ExportIngredientShipment> & { ingredient_id: string; shipment_date: string; quantity: number }) => {
      if (!shopId) throw new Error('No shop selected');
      const { data: result, error } = await supabase
        .from('export_ingredient_shipments')
        .insert({ ...data, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-ingredient-shipments', vars.ingredient_id] });
      toast.success('Shipment logged');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}
