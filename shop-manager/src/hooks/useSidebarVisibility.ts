import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useEnabledModules } from '@/hooks/useEnabledModules';

export interface SidebarVisibilitySettings {
  hidden_sections: string[];
  section_roles: Record<string, string[]>;
}

// Map navigation sections to module slugs
const SECTION_TO_MODULE_MAP: Record<string, string> = {
  'Fleet Operations': 'fleet',
  'Fleet Management': 'fleet',
  'Safety & Compliance': 'safety',
  'Safety': 'safety',
  'Marketing': 'marketing',
  'Marketing & CRM': 'marketing',
  'Non-Profit': 'nonprofit',
  'Equipment & Tools': 'equipment',
  'Equipment': 'equipment',
  'Inventory': 'inventory',
  'Automotive': 'automotive',
  'Gunsmith': 'gunsmith',
  'Power Washing': 'power_washing',
  'Marine': 'marine',
};

export function useSidebarVisibilitySettings() {
  return useQuery({
    queryKey: ['sidebar-visibility'],
    queryFn: async () => {
      // Get current user's shop_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Handle both profile patterns: id = auth.uid() OR user_id = auth.uid()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profileError || !profile?.shop_id) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', profile.shop_id)
        .eq('settings_key', 'sidebar_navigation')
        .maybeSingle();

      if (error) {
        console.error('Error fetching sidebar visibility settings:', error);
        return null;
      }

      if (!data?.settings_value) return null;

      // Type guard to ensure proper structure
      const value = data.settings_value as any;
      if (typeof value === 'object' && value !== null) {
        return {
          hidden_sections: Array.isArray(value.hidden_sections) ? value.hidden_sections : [],
          section_roles: typeof value.section_roles === 'object' ? value.section_roles : {},
        } as SidebarVisibilitySettings;
      }

      return null;
    },
  });
}

export function useUpdateSidebarVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: SidebarVisibilitySettings) => {
      // Get current user's shop_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Handle both profile patterns: id = auth.uid() OR user_id = auth.uid()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profileError || !profile?.shop_id) {
        throw new Error('No shop ID found');
      }

      const { error } = await supabase
        .from('company_settings')
        .upsert({
          shop_id: profile.shop_id,
          settings_key: 'sidebar_navigation',
          settings_value: settings as any,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-visibility'] });
    },
  });
}

export function useSidebarVisibility() {
  const { data: settings } = useSidebarVisibilitySettings();
  const { data: userRoles = [] } = useUserRoles();
  const { isModuleEnabled } = useEnabledModules();

  const isVisible = (sectionTitle: string): boolean => {
    // Check if section is hidden at shop level
    if (settings?.hidden_sections?.includes(sectionTitle)) {
      return false;
    }

    // Check role-based visibility
    const allowedRoles = settings?.section_roles?.[sectionTitle];
    if (allowedRoles && allowedRoles.length > 0) {
      // If there are allowed roles defined, user must have at least one
      if (!allowedRoles.some(role => userRoles.includes(role))) {
        return false;
      }
    }

    // Check module-based visibility - but owners see all modules
    const isOwner = userRoles.includes('owner');
    const moduleSlug = SECTION_TO_MODULE_MAP[sectionTitle];
    if (moduleSlug && !isOwner && !isModuleEnabled(moduleSlug)) {
      return false;
    }

    // If no restrictions, section is visible
    return true;
  };

  return {
    isVisible,
    settings,
    userRoles,
  };
}

