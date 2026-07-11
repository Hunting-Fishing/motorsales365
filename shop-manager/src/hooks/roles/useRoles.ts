import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DatabaseRole {
  id: string;
  name: string;
  description: string | null;
  permissions: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  display_order: number;
  member_count: number;
  members: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    job_title: string | null;
    department_name: string | null;
  }[];
}

export function useRoles() {
  const [roles, setRoles] = useState<DatabaseRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch roles with user role assignments  
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          permissions,
          is_default,
          created_at,
          updated_at,
          display_order,
          user_roles (
            user_id
          )
        `)
        .order('display_order');

      if (rolesError) {
        throw rolesError;
      }

      // Get all unique user IDs
      const allUserIds = Array.from(new Set(
        rolesData?.flatMap(role => 
          role.user_roles?.map(ur => ur.user_id) || []
        ) || []
      ));

      // Fetch profile data for all users in one query
      let profilesMap = new Map();
      if (allUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            job_title,
            department_id,
            departments (
              id,
              name
            )
          `)
          .in('id', allUserIds);

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            profilesMap.set(profile.id, profile);
          });
        }
      }

      // Transform the data with profile information
      const transformedRoles = rolesData?.map(role => ({
        ...role,
        display_order: role.display_order || 0,
        member_count: role.user_roles?.length || 0,
        members: role.user_roles?.map(ur => {
          const profile = profilesMap.get(ur.user_id);
          return {
            user_id: ur.user_id,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            email: profile?.email || null,
            job_title: profile?.job_title || null,
            department_name: profile?.departments?.name || null,
          };
        }) || []
      })) || [];

      setRoles(transformedRoles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch roles');
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRole = async (name: string, description: string, permissions: any) => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: name as any, // Cast to bypass enum restriction for custom roles
          description,
          permissions,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await fetchRoles(); // Refresh the list
      
      toast({
        title: "Success",
        description: "Role created successfully",
      });

      return data;
    } catch (err) {
      console.error('Error creating role:', err);
      toast({
        title: "Error", 
        description: "Failed to create role",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateRole = async (roleId: string, updates: Partial<Pick<DatabaseRole, 'name' | 'description' | 'permissions'>>) => {
    try {
      const updateData = {
        ...updates,
        name: updates.name as any // Cast to bypass enum restriction
      };
      const { error } = await supabase
        .from('roles')
        .update(updateData)
        .eq('id', roleId);

      if (error) {
        throw error;
      }

      await fetchRoles(); // Refresh the list
      
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    } catch (err) {
      console.error('Error updating role:', err);
      toast({
        title: "Error",
        description: "Failed to update role", 
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      // First check if role has any assignments
      const { data: assignments } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role_id', roleId);

      if (assignments && assignments.length > 0) {
        throw new Error('Cannot delete role that has assigned members');
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId);

      if (error) {
        throw error;
      }

      await fetchRoles(); // Refresh the list
      
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting role:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete role",
        variant: "destructive",
      });
      throw err;
    }
  };

  const reorderRole = async (roleId: string, direction: 'up' | 'down') => {
    try {
      // Find the role and its neighbor
      const sortedRoles = [...roles].sort((a, b) => a.display_order - b.display_order);
      const currentIndex = sortedRoles.findIndex(r => r.id === roleId);
      
      if (currentIndex === -1) return false;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= sortedRoles.length) {
        return false;
      }
      
      const currentRole = sortedRoles[currentIndex];
      const targetRole = sortedRoles[targetIndex];
      
      // Swap display_order values
      const { error: error1 } = await supabase
        .from('roles')
        .update({ display_order: targetRole.display_order })
        .eq('id', currentRole.id);
        
      if (error1) throw error1;
      
      const { error: error2 } = await supabase
        .from('roles')
        .update({ display_order: currentRole.display_order })
        .eq('id', targetRole.id);
        
      if (error2) throw error2;
      
      await fetchRoles();
      
      toast({
        title: "Role order updated",
        description: `Role moved ${direction}`,
      });
      
      return true;
    } catch (err) {
      console.error('Error reordering role:', err);
      toast({
        title: "Error",
        description: "Failed to reorder role",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRoles();

    // Set up real-time subscription for roles and user_roles changes
    const rolesChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'roles'
        },
        () => fetchRoles()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => fetchRoles()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchRoles()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  return {
    roles,
    loading,
    error,
    refetch: fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    reorderRole
  };
}