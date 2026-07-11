import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserRoles() {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role_id, roles!inner(name)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }
      
      // Extract role names and convert enum to string
      const roles = data?.map(item => {
        const role = item.roles as any;
        return role?.name?.toString();
      }).filter(Boolean) as string[] || [];
      
      console.log('User roles loaded:', roles);
      return roles;
    },
  });
}