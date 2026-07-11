import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

type ModulePermissions = {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

/**
 * Hook to check user permissions for modules
 * Checks individual user permissions first, then falls back to role defaults
 */
export function usePermissions(module?: string) {
  const { userId, isAuthenticated } = useAuthUser();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-effective-permissions', userId, module],
    queryFn: async () => {
      if (!userId || !isAuthenticated) return null;

      // If checking a specific module, get permissions for that module
      if (module) {
        const { data, error } = await supabase.rpc('get_user_effective_permissions', {
          _user_id: userId,
          _module: module,
        });

        if (error) {
          console.error('Error fetching permissions:', error);
          return null;
        }

        return data as ModulePermissions;
      }

      // Otherwise get all modules (for settings pages, etc.)
      const modules = [
        'work_orders',
        'inventory',
        'equipment_tracking',
        'customers',
        'accounting',
        'team',
        'reports',
      ];

      const allPermissions: Record<string, ModulePermissions> = {};

      for (const mod of modules) {
        const { data, error } = await supabase.rpc('get_user_effective_permissions', {
          _user_id: userId,
          _module: mod,
        });

        if (!error && data) {
          allPermissions[mod] = data as ModulePermissions;
        }
      }

      return allPermissions;
    },
    enabled: isAuthenticated && !!userId,
  });

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (!permissions || !module) return false;
    
    // If checking all modules, return false (use hasModulePermission instead)
    if (typeof permissions === 'object' && !('view' in permissions)) {
      return false;
    }

    const modulePerms = permissions as ModulePermissions;
    return modulePerms[action] === true;
  };

  /**
   * Check if user has permission for a specific module and action
   */
  const hasModulePermission = (mod: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    if (!permissions || typeof permissions !== 'object') return false;
    
    const allPerms = permissions as Record<string, ModulePermissions>;
    return allPerms[mod]?.[action] === true;
  };

  /**
   * Check if user can view the module
   */
  const canView = module ? hasPermission('view') : false;

  /**
   * Check if user can create in the module
   */
  const canCreate = module ? hasPermission('create') : false;

  /**
   * Check if user can edit in the module
   */
  const canEdit = module ? hasPermission('edit') : false;

  /**
   * Check if user can delete in the module
   */
  const canDelete = module ? hasPermission('delete') : false;

  return {
    permissions,
    isLoading,
    hasPermission,
    hasModulePermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}
