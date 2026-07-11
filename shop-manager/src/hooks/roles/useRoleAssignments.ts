import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string;
}

export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  role_name: string;
  user_name: string;
  user_email: string | null;
}

export function useRoleAssignments() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          created_at,
          roles (
            name
          )
        `);

      if (error) {
        throw error;
      }

      const transformedAssignments = data?.map(assignment => ({
        id: assignment.id,
        user_id: assignment.user_id,
        role_id: assignment.role_id,
        created_at: assignment.created_at,
        role_name: assignment.roles?.name || 'Unknown Role',
        user_name: 'Unknown User',
        user_email: null,
      })) || [];

      setAssignments(transformedAssignments);
    } catch (err) {
      console.error('Error fetching role assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch role assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          created_at
        `)
        .order('first_name');

      if (error) {
        throw error;
      }

      const transformedMembers = data?.map(profile => ({
        ...profile,
        role: null
      })) || [];

      setTeamMembers(transformedMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single();

      if (existing) {
        toast({
          title: "Info",
          description: "User already has this role assigned",
        });
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role_id: roleId
        }]);

      if (error) {
        throw error;
      }

      await fetchAssignments();
      
      toast({
        title: "Success",
        description: "Role assigned successfully",
      });
    } catch (err) {
      console.error('Error assigning role:', err);
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
      throw err;
    }
  };

  const removeRole = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        throw error;
      }

      await fetchAssignments();
      
      toast({
        title: "Success",
        description: "Role removed successfully",
      });
    } catch (err) {
      console.error('Error removing role:', err);
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
      throw err;
    }
  };

  const removeUserFromRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        throw error;
      }

      await fetchAssignments();
      
      toast({
        title: "Success",
        description: "User removed from role successfully",
      });
    } catch (err) {
      console.error('Error removing user from role:', err);
      toast({
        title: "Error",
        description: "Failed to remove user from role",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchTeamMembers();
  }, []);

  return {
    assignments,
    teamMembers,
    loading,
    error,
    refetch: fetchAssignments,
    assignRole,
    removeRole,
    removeUserFromRole,
    refreshTeamMembers: fetchTeamMembers
  };
}