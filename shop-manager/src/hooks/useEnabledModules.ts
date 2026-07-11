import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface BusinessModule {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  is_premium: boolean;
  default_enabled: boolean;
  related_industries: string[] | null;
  display_order: number;
}

export interface EnabledModule {
  id: string;
  shop_id: string;
  module_id: string;
  enabled_at: string;
  enabled_by: string | null;
}

export function useBusinessModules() {
  return useQuery({
    queryKey: ['business-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_modules')
        .select('*')
        .order('display_order');

      if (error) throw error;
      return data as BusinessModule[];
    },
  });
}

export function useUserShopId() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['user-shop-id', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();
      return data?.shop_id || null;
    },
    enabled: !!user,
  });
}

export function useShopEnabledModules() {
  const { user } = useAuthUser();
  const { data: shopId } = useUserShopId();

  return useQuery({
    queryKey: ['shop-enabled-modules', shopId],
    queryFn: async () => {
      if (!shopId) return [];

      const { data, error } = await supabase
        .from('shop_enabled_modules')
        .select('*')
        .eq('shop_id', shopId);

      if (error) throw error;
      return data as EnabledModule[];
    },
    enabled: !!user && !!shopId,
  });
}

export function useToggleModule() {
  const queryClient = useQueryClient();
  const { user } = useAuthUser();

  return useMutation({
    mutationFn: async ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop found');

      if (enabled) {
        const { error } = await supabase
          .from('shop_enabled_modules')
          .insert({
            shop_id: profile.shop_id,
            module_id: moduleId,
            enabled_by: user.id,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shop_enabled_modules')
          .delete()
          .eq('shop_id', profile.shop_id)
          .eq('module_id', moduleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-enabled-modules'] });
    },
  });
}

export function useEnabledModules() {
  const { data: modules = [], isLoading: isLoadingModules } = useBusinessModules();
  const { data: enabledModules = [], isLoading: isLoadingEnabled } = useShopEnabledModules();
  const { data: shopId, isLoading: isLoadingShop } = useUserShopId();

  const hasShop = !!shopId;
  const enabledModuleIds = new Set(enabledModules.map(em => em.module_id));

  const isModuleEnabled = (moduleSlug: string): boolean => {
    // No shop means no modules enabled
    if (!hasShop) return false;

    const module = modules.find(m => m.slug === moduleSlug);
    if (!module) return false;

    // If explicitly enabled
    if (enabledModuleIds.has(module.id)) return true;

    // If no explicit modules set, use defaults
    if (enabledModules.length === 0) return module.default_enabled;

    return false;
  };

  const getEnabledModuleSlugs = (): string[] => {
    // No shop = no modules
    if (!hasShop) return [];

    if (enabledModules.length === 0) {
      // Use defaults only if shop exists
      return modules.filter(m => m.default_enabled).map(m => m.slug);
    }
    return modules
      .filter(m => enabledModuleIds.has(m.id))
      .map(m => m.slug);
  };

  return {
    modules,
    enabledModules,
    hasShop,
    isModuleEnabled,
    getEnabledModuleSlugs,
    isLoading: isLoadingModules || isLoadingEnabled || isLoadingShop,
  };
}
