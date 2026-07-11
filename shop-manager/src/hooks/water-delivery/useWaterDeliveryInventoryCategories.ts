import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';

export interface InventoryCategory {
  id: string;
  shop_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventorySubcategory {
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

export interface CreateCategoryData {
  name: string;
  description?: string;
  icon?: string;
}

export interface CreateSubcategoryData {
  category_id: string;
  name: string;
  description?: string;
}

// Default categories used as fallback when no DB categories exist
const DEFAULT_CATEGORIES = [
  { value: 'filter', label: 'Filters' },
  { value: 'pipe_fitting', label: 'Pipes & Fittings' },
  { value: 'hose', label: 'Hoses' },
  { value: 'pump', label: 'Pumps' },
  { value: 'chemical', label: 'Chemicals' },
  { value: 'tank', label: 'Tanks' },
  { value: 'tool', label: 'Tools' },
  { value: 'ppe', label: 'PPE' },
  { value: 'maintenance', label: 'Maintenance Supplies' },
  { value: 'other', label: 'Other' },
];

export function useWaterDeliveryInventoryCategories() {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['water-delivery-inventory-categories', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('water_delivery_inventory_categories')
        .select('*')
        .or(`shop_id.eq.${shopId},shop_id.is.null`)
        .eq('is_active', true)
        .order('display_order')
        .order('name');

      if (error) throw error;
      return data as InventoryCategory[];
    },
    enabled: !!shopId,
  });
}

export function useWaterDeliveryInventorySubcategories(categoryId?: string) {
  const { shopId } = useShopId();

  return useQuery({
    queryKey: ['water-delivery-inventory-subcategories', shopId, categoryId],
    queryFn: async () => {
      if (!shopId) return [];

      let query = supabase
        .from('water_delivery_inventory_subcategories')
        .select('*')
        .or(`shop_id.eq.${shopId},shop_id.is.null`)
        .eq('is_active', true)
        .order('display_order')
        .order('name');

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InventorySubcategory[];
    },
    enabled: !!shopId,
  });
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: CreateCategoryData) => {
      if (!shopId) throw new Error('No shop selected');

      // Generate slug from name
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const { data: result, error } = await supabase
        .from('water_delivery_inventory_categories')
        .insert({
          shop_id: shopId,
          name: data.name,
          slug,
          description: data.description,
          icon: data.icon,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return result as InventoryCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-inventory-categories'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
}

export function useCreateInventorySubcategory() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  return useMutation({
    mutationFn: async (data: CreateSubcategoryData) => {
      if (!shopId) throw new Error('No shop selected');

      // Generate slug from name
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const { data: result, error } = await supabase
        .from('water_delivery_inventory_subcategories')
        .insert({
          shop_id: shopId,
          category_id: data.category_id,
          name: data.name,
          slug,
          description: data.description,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return result as InventorySubcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-inventory-subcategories'] });
      toast.success('Subcategory created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create subcategory: ${error.message}`);
    },
  });
}

// Hook to get categories with fallback to defaults
export function useCategoryOptions() {
  const { data: categories = [], isLoading } = useWaterDeliveryInventoryCategories();

  // If we have DB categories, use them. Otherwise use defaults
  const categoryOptions = categories.length > 0
    ? categories.map(cat => ({ value: cat.slug, label: cat.name, id: cat.id }))
    : DEFAULT_CATEGORIES.map(cat => ({ value: cat.value, label: cat.label, id: null as string | null }));

  return {
    categories: categoryOptions,
    isLoading,
    hasDbCategories: categories.length > 0,
  };
}
