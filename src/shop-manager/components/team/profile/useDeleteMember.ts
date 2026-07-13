
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export function useDeleteMember() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Handle member deletion using real data
  const handleDeleteMember = async (memberId: string) => {
    if (!memberId) {
      toast({
        title: "Error",
        description: "Cannot delete member: Missing member ID.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      console.log("Deleting team member:", memberId);
      
      // First create a history record of this deletion action
      const { error: historyError } = await supabase
        .from('team_member_history' as any)
        .insert({
          profile_id: memberId,
          action_type: 'deletion',
          action_by: (await supabase.auth.getUser()).data.user?.id || 'system',
          details: {
            action: 'team_member_removed',
            timestamp: new Date().toISOString()
          }
        });
      
      if (historyError) {
        console.error("Error recording deletion history:", historyError);
        // Continue with deletion even if history recording fails
      }
      
      // Remove any role assignments for this user
      const { error: roleDeleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberId);
        
      if (roleDeleteError) {
        console.error("Error removing user roles:", roleDeleteError);
        // Continue with deletion even if role deletion fails
      }
      
      // Create or update profile_metadata record for this user with inactive status
      const { data: existingMetadata } = await supabase
        .from('profile_metadata')
        .select('*')
        .eq('profile_id', memberId)
        .single();
      
      // This is the key part that ensures the deleted member doesn't show up in the list
      // We're setting status to 'inactive', is_active to false, and adding a deactivated_at timestamp
      const metadataObj = {
        profile_id: memberId,
        metadata: {
          status: 'deleted', // Changed from 'inactive' to 'deleted' for clarity
          deactivated_at: new Date().toISOString(),
          is_active: false
        }
      };
      
      if (existingMetadata) {
        // Update existing metadata to mark user as deleted
        // Make sure we safely handle the metadata object
        const currentMetadata = typeof existingMetadata.metadata === 'object' && existingMetadata.metadata !== null 
          ? existingMetadata.metadata 
          : {};
          
        const { error: updateError } = await supabase
          .from('profile_metadata')
          .update({
            metadata: {
              ...currentMetadata,
              status: 'deleted', // Changed from 'inactive' to 'deleted' for clarity
              deactivated_at: new Date().toISOString(),
              is_active: false
            }
          })
          .eq('profile_id', memberId);
          
        if (updateError) {
          console.error("Error updating profile metadata:", updateError);
          throw updateError;
        }
      } else {
        // Create new metadata entry with deleted status
        const { error: insertError } = await supabase
          .from('profile_metadata')
          .insert(metadataObj);
          
        if (insertError) {
          console.error("Error creating profile metadata:", insertError);
          throw insertError;
        }
      }
      
      toast({
        title: "Team member removed",
        description: "The team member has been successfully removed from the team.",
        variant: "success",
      });
      
      navigate("/team");
    } catch (error) {
      console.error("Error deleting member:", error);
      toast({
        title: "Error",
        description: "Failed to delete team member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return {
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleDeleteMember,
    isDeleting
  };
}
