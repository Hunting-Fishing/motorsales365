import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface ExportMainCategory {
  id: string;
  shop_id: string | null;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useExportMainCategories() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['export-main-categories', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('export_main_categories')
        .select('*')
        .or(`shop_id.eq.${shopId},shop_id.is.null`)
        .eq('is_active', true)
        .order('display_order')
        .order('name');
      if (error) throw error;
      return (data || []) as ExportMainCategory[];
    },
    enabled: !!shopId,
  });
}

export function useCreateExportMainCategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: { name: string; icon?: string }) => {
      if (!shopId) throw new Error('No shop selected');
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const { data: result, error } = await supabase
        .from('export_main_categories')
        .insert({
          shop_id: shopId,
          name: data.name,
          slug,
          icon: data.icon || '📦',
          display_order: 50,
          is_system: false,
        })
        .select()
        .single();
      if (error) throw error;
      return result as ExportMainCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-main-categories'] });
      toast.success('Main category created');
    },
    onError: (error: any) => toast.error(`Failed: ${error.message}`),
  });
}
