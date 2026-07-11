import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface ExportProductVariant {
  id: string;
  shop_id: string;
  product_id: string;
  variant_name: string;
  sku: string | null;
  unit_of_measure: string;
  weight_per_unit: number | null;
  packaging_type: string | null;
  packaging_option_id: string | null;
  units_per_package: number;
  unit_price: number;
  purchase_cost_per_unit: number;
  shipping_cost_per_unit: number;
  customs_duty_per_unit: number;
  insurance_cost_per_unit: number;
  handling_fee_per_unit: number;
  packaging_cost_per_unit: number;
  inspection_cost_per_unit: number;
  landed_cost_per_unit: number | null;
  profit_margin_pct: number | null;
  current_stock: number;
  reorder_level: number;
  batch_number: string | null;
  lot_number: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useExportProductVariants(productId: string | null) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['export-product-variants', productId],
    queryFn: async () => {
      if (!shopId || !productId) return [];
      const { data, error } = await supabase
        .from('export_product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('shop_id', shopId)
        .order('variant_name');
      if (error) throw error;
      return data as ExportProductVariant[];
    },
    enabled: !!shopId && !!productId,
  });
}

export function useCreateExportVariant() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: Partial<ExportProductVariant> & { product_id: string; variant_name: string }) => {
      if (!shopId) throw new Error('No shop selected');
      const { data: result, error } = await supabase
        .from('export_product_variants')
        .insert({ ...data, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-product-variants', vars.product_id] });
      toast.success('Variant added');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useUpdateExportVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId, ...data }: Partial<ExportProductVariant> & { id: string; productId: string }) => {
      const { error } = await supabase
        .from('export_product_variants')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-product-variants', vars.productId] });
      toast.success('Variant updated');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useDeleteExportVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('export_product_variants')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['export-product-variants', vars.productId] });
      toast.success('Variant removed');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}
