
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserRole {
  user_id: string;
  role_id: string;
  roles: {
    id: string;
    name: string;
  };
}

/**
 * Hook for fetching user role assignments from Supabase
 */
export function useFetchUserRoles() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRoles = async (): Promise<UserRole[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch user roles from Supabase
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role_id,
          roles:role_id(
            id,
            name
          )
        `);
        
      if (rolesError) {
        console.warn("Error fetching user roles:", rolesError);
        setError(rolesError.message);
        return [];
      }

      if (!userRolesData) {
        return [];
      }
      
      // Convert to proper format with single role object
      const userRoles: UserRole[] = userRolesData.map(item => {
        // Check if roles exists and is an object (not an array)
        const roleObject = item.roles && 
          typeof item.roles === 'object' && 
          !Array.isArray(item.roles) ? 
          item.roles : { id: '', name: '' };
          
        return {
          user_id: item.user_id,
          role_id: item.role_id,
          roles: {
            id: roleObject.id || '',
            name: roleObject.name || ''
          }
        };
      });

      return userRoles;
    } catch (err) {
      console.error('Error fetching user roles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user roles');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchUserRoles,
    isLoading,
    error
  };
}
