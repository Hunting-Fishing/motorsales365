import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalBusinessInfo {
  displayName: string;
  displayPhone: string | null;
  displayEmail: string | null;
  displayDescription: string | null;
  shopName: string;
  shopId: string;
}

/**
 * Hook to get the business display info for the fuel delivery module
 * Used in customer portal pages to show the business branding
 */
export function usePortalBusinessInfo(shopId: string | null) {
  return useQuery({
    queryKey: ['portal-business-info', shopId],
    queryFn: async (): Promise<PortalBusinessInfo | null> => {
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
          display_phone,
          display_email,
          display_description,
          business_modules!inner(slug)
        `)
        .eq('shop_id', shopId)
        .eq('business_modules.slug', 'fuel_delivery')
        .maybeSingle();

      if (moduleError) {
        console.error('Error fetching module display info:', moduleError);
      }

      return {
        displayName: moduleData?.display_name || shop.name,
        displayPhone: moduleData?.display_phone || null,
        displayEmail: moduleData?.display_email || null,
        displayDescription: moduleData?.display_description || null,
        shopName: shop.name,
        shopId: shop.id,
      };
    },
    enabled: !!shopId,
  });
}
