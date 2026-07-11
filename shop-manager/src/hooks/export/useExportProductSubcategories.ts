import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface ExportSubcategory {
  id: string;
  shop_id: string | null;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useExportProductSubcategories(categoryId: string | null) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['export-product-subcategories', shopId, categoryId],
    queryFn: async () => {
      if (!shopId || !categoryId) return [];
      const { data, error } = await supabase
        .from('export_product_subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .or(`shop_id.eq.${shopId},shop_id.is.null`)
        .eq('is_active', true)
        .order('display_order')
        .order('name');
      if (error) throw error;
      return (data || []) as ExportSubcategory[];
    },
    enabled: !!shopId && !!categoryId,
  });
}

export function useCreateExportSubcategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: { category_id: string; name: string; description?: string }) => {
      if (!shopId) throw new Error('No shop selected');
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const { data: result, error } = await supabase
        .from('export_product_subcategories')
        .insert({ shop_id: shopId, category_id: data.category_id, name: data.name, slug, description: data.description || null, is_system: false })
        .select()
        .single();
      if (error) throw error;
      return result as ExportSubcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-product-subcategories'] });
      toast.success('Subcategory created');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useDeleteExportSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('export_product_subcategories').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-product-subcategories'] });
      toast.success('Subcategory removed');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}
