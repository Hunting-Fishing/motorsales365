import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type ModulePermissions = Record<string, ModulePermission>;

/**
 * Hook to fetch all module permissions for the current user.
 * Uses the get_user_effective_permissions RPC to get permissions that consider
 * both individual user overrides and role defaults.
 */
export function useModulePermissions() {
  const { userId, isAuthenticated } = useAuthUser();

  return useQuery({
    queryKey: ['all-module-permissions', userId],
    queryFn: async (): Promise<ModulePermissions> => {
      if (!userId || !isAuthenticated) return {};

      // List of all modules we need to check
      const modules = [
        'accounting',
        'analytics',
        'calendar',
        'call_logger',
        'customer_communications',
        'customers',
        'developer_tools',
        'documents',
        'email_campaigns',
        'equipment_tracking',
        'fleet_management',
        'insurance',
        'inventory',
        'invoices',
        'maintenance_requests',
        'marketing',
        'orders',
        'payments',
        'quotes',
        'reports',
        'safety',
        'security',
        'septic',
        'service_catalog',
        'service_packages',
        'service_reminders',
        'settings',
        'shopping',
        'sms_management',
        'team',
        'team_chat',
        'work_orders',
        'export_company',
      ];

      const allPermissions: ModulePermissions = {};

      // Fetch permissions for all modules
      const permissionPromises = modules.map(async (module) => {
        try {
          const { data, error } = await supabase.rpc('get_user_effective_permissions', {
            _user_id: userId,
            _module: module,
          });

          if (!error && data && typeof data === 'object') {
            const permData = data as Record<string, unknown>;
            allPermissions[module] = {
              view: permData.view === true,
              create: permData.create === true,
              edit: permData.edit === true,
              delete: permData.delete === true,
            };
          } else {
            // Default to no permissions if error
            allPermissions[module] = { view: false, create: false, edit: false, delete: false };
          }
        } catch {
          allPermissions[module] = { view: false, create: false, edit: false, delete: false };
        }
      });

      await Promise.all(permissionPromises);

      return allPermissions;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Check if user has view permission for a specific module
 */
export function useHasModuleViewPermission(module: string | undefined): boolean {
  const { data: permissions, isLoading } = useModulePermissions();
  
  // If no module specified, allow access
  if (!module) return true;
  
  // While loading, default to showing (prevents flash of hidden content)
  if (isLoading) return true;
  
  // Check if user has view permission for this module
  return permissions?.[module]?.view ?? false;
}
