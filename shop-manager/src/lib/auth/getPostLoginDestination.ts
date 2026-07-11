import { supabase } from '@/integrations/supabase/client';

/**
 * Module slug to route mapping
 */
const MODULE_ROUTES: Record<string, string> = {
  'automotive': '/automotive',
  'water-delivery': '/water-delivery',
  'marine': '/marine-services',
  'gunsmith': '/gunsmith',
  'power-washing': '/power-washing',
  'fuel-delivery': '/fuel-delivery',
  'septic': '/septic',
  'export-company': '/export',
  'personal-trainer': '/personal-trainer',
  'welding': '/welding',
  'game-development': '/game-development',
};

/**
 * Determines where to redirect user after login based on their shop and enabled modules.
 * This is the single source of truth for post-login navigation.
 * 
 * @param userId - The authenticated user's ID
 * @returns The path to navigate to
 */
export async function getPostLoginDestination(userId: string): Promise<string> {
  try {
    // Get user's profile to find their shop_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (!profile?.shop_id) {
      // No shop - go to onboarding
      return '/onboarding';
    }

    // Get enabled modules for this shop
    const { data: enabledModules } = await supabase
      .from('shop_enabled_modules')
      .select('module_id, business_modules(slug)')
      .eq('shop_id', profile.shop_id);

    if (!enabledModules || enabledModules.length === 0) {
      // No modules enabled - go to module hub to select
      return '/module-hub';
    }

    if (enabledModules.length === 1) {
      // Only one module - redirect directly to that module's dashboard
      const moduleSlug = (enabledModules[0] as any).business_modules?.slug;
      if (moduleSlug && MODULE_ROUTES[moduleSlug]) {
        return MODULE_ROUTES[moduleSlug];
      }
    }

    // Multiple modules or unknown module - go to module hub to select
    return '/module-hub';
  } catch (error) {
    console.error('Error determining post-login destination:', error);
    return '/module-hub';
  }
}
