import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface ExportCategory {
  id: string;
  shop_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  group_name: string | null;
  main_category_id: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useExportProductCategories() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['export-product-categories', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('export_product_categories')
        .select('*')
        .or(`shop_id.eq.${shopId},shop_id.is.null`)
        .eq('is_active', true)
        .order('display_order')
        .order('name');
      if (error) throw error;
      return data as ExportCategory[];
    },
    enabled: !!shopId,
  });
}

export function useCreateExportCategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; icon?: string; main_category_id?: string }) => {
      if (!shopId) throw new Error('No shop selected');
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const { data: result, error } = await supabase
        .from('export_product_categories')
        .insert({ shop_id: shopId, name: data.name, slug, description: data.description || null, icon: data.icon || null, is_system: false, main_category_id: data.main_category_id || null })
        .select()
        .single();
      if (error) throw error;
      return result as ExportCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-product-categories'] });
      toast.success('Category created');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}

export function useDeleteExportCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('export_product_categories').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-product-categories'] });
      toast.success('Category removed');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}
