import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleDisplayInfo {
  displayName: string;
  displayLogoUrl: string | null;
  displayPhone: string | null;
  displayEmail: string | null;
  displayAddress: string | null;
  displayDescription: string | null;
  shopName: string;
  shopId: string;
}

/**
 * Hook to get the display info for a specific module.
 * Returns the module-specific display name if set, otherwise falls back to shop name.
 */
export function useModuleDisplayInfo(shopId: string | null, moduleSlug: string) {
  return useQuery({
    queryKey: ['module-display-info', shopId, moduleSlug],
    queryFn: async (): Promise<ModuleDisplayInfo | null> => {
      if (!shopId) return null;

      // Get shop info
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, name')
        .eq('id', shopId)
        .single();

      if (shopError || !shop) {
        console.error('Error fetching shop:', shopError);
        return null;
      }

      // Get module display info from shop_enabled_modules
      const { data: moduleData, error: moduleError } = await supabase
        .from('shop_enabled_modules')
        .select(`
          display_name,
          display_logo_url,
          display_phone,
          display_email,
          display_address,
          display_description,
          business_modules!inner(slug)
        `)
        .eq('shop_id', shopId)
        .eq('business_modules.slug', moduleSlug)
        .maybeSingle();

      if (moduleError) {
        console.error('Error fetching module display info:', moduleError);
      }

      return {
        displayName: moduleData?.display_name || shop.name,
        displayLogoUrl: moduleData?.display_logo_url || null,
        displayPhone: moduleData?.display_phone || null,
        displayEmail: moduleData?.display_email || null,
        displayAddress: moduleData?.display_address || null,
        displayDescription: moduleData?.display_description || null,
        shopName: shop.name,
        shopId: shop.id,
      };
    },
    enabled: !!shopId,
  });
}

/**
 * Hook to update the display info for a specific module.
 */
export function useUpdateModuleDisplayInfo() {
  const updateDisplayInfo = async (
    shopId: string,
    moduleSlug: string,
    displayInfo: Partial<{
      display_name: string | null;
      display_logo_url: string | null;
      display_phone: string | null;
      display_email: string | null;
      display_address: string | null;
      display_description: string | null;
    }>
  ) => {
    // Get the module ID
    const { data: module } = await supabase
      .from('business_modules')
      .select('id')
      .eq('slug', moduleSlug)
      .single();

    if (!module) {
      throw new Error(`Module ${moduleSlug} not found`);
    }

    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();

    // Check if record exists
    const { data: existing } = await supabase
      .from('shop_enabled_modules')
      .select('id')
      .eq('shop_id', shopId)
      .eq('module_id', module.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('shop_enabled_modules')
        .update(displayInfo)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('shop_enabled_modules')
        .insert({
          shop_id: shopId,
          module_id: module.id,
          enabled_by: user?.id || null,
          ...displayInfo,
        });
      if (error) throw error;
    }
  };

  return { updateDisplayInfo };
}
