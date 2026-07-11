
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthUser } from './useAuthUser';

export interface UserRoleInfo {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRoleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, isAuthenticated } = useAuthUser();

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setUserRole(null);
      return;
    }

    const fetchUserRole = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First try to get role from user_roles table
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
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (userRolesError && userRolesError.code !== 'PGRST116') {
          throw userRolesError;
        }

        if (userRolesData && userRolesData.roles) {
          const role = userRolesData.roles as any;
          const roleDisplayNames: Record<string, string> = {
            'owner': 'Owner',
            'admin': 'Administrator', 
            'manager': 'Manager',
            'parts_manager': 'Parts Manager',
            'service_advisor': 'Service Advisor',
            'technician': 'Technician',
            'reception': 'Reception',
            'other_staff': 'Other Staff',
            'customer': 'Customer'
          };

          setUserRole({
            id: role.id,
            name: role.name,
            displayName: roleDisplayNames[role.name] || role.name,
            description: role.description
          });
        } else {
          // Fallback: Check if user is a customer
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('auth_user_id', userId)
            .limit(1)
            .single();

          if (customerData) {
            setUserRole({
              id: 'customer',
              name: 'customer',
              displayName: 'Customer',
              description: 'Customer user'
            });
          } else {
            // Default fallback
            setUserRole({
              id: 'user',
              name: 'user',
              displayName: 'User',
              description: 'Standard user'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to load user role');
        // Set a default role on error
        setUserRole({
          id: 'user',
          name: 'user',
          displayName: 'User',
          description: 'Standard user'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [userId, isAuthenticated]);

  return { userRole, isLoading, error };
}
