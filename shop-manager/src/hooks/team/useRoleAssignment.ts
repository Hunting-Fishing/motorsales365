
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { recordTeamMemberHistory } from '@/utils/team/history/recordHistory';

interface RoleAssignmentProps {
  currentUserName: string;
  currentUserId: string;
}

export const useRoleAssignment = ({ currentUserName, currentUserId }: RoleAssignmentProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const assignRole = async (userId: string, roleName: string) => {
    setLoading(true);
    try {
      // First get the role ID from the role name
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName.toLowerCase() as any) // Cast to match app_role enum
        .single();
      
      if (roleError || !roleData) {
        throw new Error(`Role "${roleName}" not found`);
      }
      
      const { data, error } = await supabase.rpc('assign_role_to_user', {
        user_id_param: userId,
        role_id_param: roleData.id,
      });
      
      if (error) throw error;
      
      // Record the action in history
      await recordTeamMemberHistory({
        profile_id: userId,
        action_type: 'role_assigned',
        action_by: currentUserId,
        action_by_name: currentUserName,
        details: { role_id: roleData.id, role_name: roleName }
      });
      
      toast({
        title: "Role assigned successfully",
        description: "The user's role has been updated.",
      });
      
      return { success: true };
    } catch (error: any) {
      console.error("Error assigning role:", error);
      toast({
        title: "Error assigning role",
        description: error.message || "An error occurred while assigning the role.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };
  
  const removeRole = async (userRoleId: string, userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('remove_role_from_user', {
        user_role_id_param: userRoleId,
      });
      
      if (error) throw error;
      
      // Record the action in history
      await recordTeamMemberHistory({
        profile_id: userId,
        action_type: 'role_removed',
        action_by: currentUserId,
        action_by_name: currentUserName,
        details: { user_role_id: userRoleId }
      });
      
      toast({
        title: "Role removed successfully",
        description: "The user's role has been updated.",
      });
      
      return { success: true };
    } catch (error: any) {
      console.error("Error removing role:", error);
      toast({
        title: "Error removing role",
        description: error.message || "An error occurred while removing the role.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { assignRole, removeRole, loading };
};
