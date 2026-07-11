import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DepartmentMember {
  id: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  department_id: string;
  email?: string;
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

export interface DepartmentWithMembers {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  members: DepartmentMember[];
}

export function useDepartmentMembers() {
  const [departmentsWithMembers, setDepartmentsWithMembers] = useState<DepartmentWithMembers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchDepartmentMembers = async () => {
    try {
      setIsLoading(true);
      
      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();
        
      if (!profile?.shop_id) return;
      
      // Fetch departments with member counts and member details
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          description,
          profiles!inner(
            id,
            first_name,
            last_name,
            job_title,
            email
          )
        `)
        .eq('shop_id', profile.shop_id)
        .order('name');
        
      if (deptError) {
        console.error('Error fetching departments:', deptError);
        return;
      }
      
      // Also fetch departments with no members
      const { data: allDepartments, error: allDeptError } = await supabase
        .from('departments')
        .select('id, name, description')
        .eq('shop_id', profile.shop_id)
        .order('name');
        
      if (allDeptError) {
        console.error('Error fetching all departments:', allDeptError);
        return;
      }

      // Get all user IDs to fetch their roles
      const allUserIds = departments?.flatMap(dept => 
        dept.profiles?.map((profile: any) => profile.id) || []
      ) || [];

      // Fetch role assignments for all users
      let userRoles: any[] = [];
      if (allUserIds.length > 0) {
        const { data: roleAssignments, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            roles (
              id,
              name
            )
          `)
          .in('user_id', allUserIds);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        } else {
          userRoles = roleAssignments || [];
        }
      }
      
      // Transform data to include member counts and role information
      const departmentsWithCounts = allDepartments?.map(dept => {
        const deptWithMembers = departments?.find(d => d.id === dept.id);
        const members = (deptWithMembers?.profiles || []).map((member: any) => {
          // Find roles for this user
          const memberRoles = userRoles
            .filter(ur => ur.user_id === member.id)
            .map(ur => ur.roles)
            .filter(Boolean);
          
          return {
            ...member,
            department_id: dept.id,
            roles: memberRoles
          };
        });
        
        return {
          id: dept.id,
          name: dept.name,
          description: dept.description,
          memberCount: members.length,
          members
        };
      }) || [];
      
      setDepartmentsWithMembers(departmentsWithCounts);
    } catch (error) {
      console.error('Error in fetchDepartmentMembers:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const assignUserToDepartment = async (userId: string, departmentId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: departmentId })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Refresh data
      await fetchDepartmentMembers();
      return true;
    } catch (error) {
      console.error('Error assigning user to department:', error);
      return false;
    }
  };
  
  const removeUserFromDepartment = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ department_id: null })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Refresh data
      await fetchDepartmentMembers();
      return true;
    } catch (error) {
      console.error('Error removing user from department:', error);
      return false;
    }
  };
  
  useEffect(() => {
    fetchDepartmentMembers();

    // Set up real-time subscription for departments, profiles, and user_roles changes
    const deptChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'departments'
        },
        () => fetchDepartmentMembers()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchDepartmentMembers()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => fetchDepartmentMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deptChannel);
    };
  }, []);
  
  return {
    departmentsWithMembers,
    isLoading,
    refetch: fetchDepartmentMembers,
    assignUserToDepartment,
    removeUserFromDepartment
  };
}