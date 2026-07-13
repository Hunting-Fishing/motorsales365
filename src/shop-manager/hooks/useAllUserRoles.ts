import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
  source: 'role' | 'developer';
}

const roleDisplayNames: Record<string, string> = {
  'owner': 'Owner',
  'admin': 'Administrator',
  'manager': 'Manager',
  'parts_manager': 'Parts Manager',
  'service_advisor': 'Service Advisor',
  'technician': 'Technician',
  'reception': 'Reception',
  'other_staff': 'Other Staff',
  'customer': 'Customer',
  'developer': 'Developer',
};

/**
 * Fetches ALL roles for the current user, including:
 * - Roles from user_roles table
 * - Developer role if user is a platform developer
 */
export function useAllUserRoles() {
  const { userId, isAuthenticated } = useAuthUser();

  return useQuery({
    queryKey: ['all-user-roles', userId],
    queryFn: async (): Promise<RoleInfo[]> => {
      if (!userId) return [];

      const roles: RoleInfo[] = [];

      // Fetch roles from user_roles table
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          roles:role_id(
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId);

      if (userRolesError) {
        console.error('Error fetching user roles:', userRolesError);
      } else if (userRolesData) {
        for (const item of userRolesData) {
          const role = item.roles as any;
          if (role?.name) {
            roles.push({
              id: role.id,
              name: role.name,
              displayName: roleDisplayNames[role.name] || role.name,
              source: 'role',
            });
          }
        }
      }

      // Check if user is a platform developer
      const { data: isDeveloper, error: devError } = await supabase.rpc('is_platform_developer', {
        _user_id: userId,
      });

      if (devError) {
        console.error('Error checking platform developer status:', devError);
      } else if (isDeveloper === true) {
        roles.push({
          id: 'platform-developer',
          name: 'developer',
          displayName: 'Developer',
          source: 'developer',
        });
      }

      return roles;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Returns the primary role display (first role) and whether user is a developer
 */
export function usePrimaryRoleInfo() {
  const { data: roles = [], isLoading, error } = useAllUserRoles();

  const isDeveloper = roles.some(r => r.source === 'developer');
  const primaryRole = roles.find(r => r.source === 'role') || roles[0];
  const allRoleNames = roles.map(r => r.displayName);

  return {
    primaryRole,
    allRoles: roles,
    allRoleNames,
    isDeveloper,
    isLoading,
    error,
  };
}
