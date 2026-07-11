
import { supabase } from '@/lib/supabase';
import { saveProfileMetadata } from '@/lib/profileMetadata';
import { TeamMemberFormValues } from '@/components/team/form/formValidation';
import { toast } from '@/hooks/use-toast';
import { mapRoleToDbValue, validateRoleValue } from '@/utils/roleUtils';

/**
 * Updates a user's profile in the Supabase profiles table
 */
export const updateUserProfile = async (
  userId: string, 
  values: TeamMemberFormValues
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Update the profile with all available fields
    const { error, data } = await supabase
      .from('profiles')
      .update({
        first_name: values.firstName,
        middle_name: values.middleName || null,
        last_name: values.lastName,
        email: values.email,
        phone: values.phone || null,
        job_title: values.jobTitle,
        department: values.department,
      })
      .eq('id', userId)
      .select();
    
    if (error) {
      console.error("Profile update error:", error);
      return { 
        success: false,
        error: error.message
      };
    }
    
    console.log("Profile update result:", data);
    
    // Save additional metadata if provided
    if (values.notes) {
      try {
        const metadataSaved = await saveProfileMetadata(userId, values.notes);
        if (!metadataSaved) {
          console.warn("Could not save profile metadata, but continuing with other updates");
        }
      } catch (metadataError) {
        console.error("Metadata operation error:", metadataError);
        // Continue with the update even if metadata fails
      }
    }

    // Update role if provided
    if (values.role) {
      try {
        const dbRoleName = mapRoleToDbValue(values.role);
        const validatedRoleName = validateRoleValue(dbRoleName);

        // Get the role ID
        const { data: roleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', validatedRoleName)
          .single();
          
        if (roleError) {
          console.warn(`Role not found for ${validatedRoleName}:`, roleError);
        } else if (roleData) {
          // Check for any existing role
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (existingRole) {
            // Update the existing role
            await supabase
              .from('user_roles')
              .update({ role_id: roleData.id })
              .eq('id', existingRole.id);
          } else {
            // Create a new role assignment
            await supabase
              .from('user_roles')
              .insert({
                user_id: userId,
                role_id: roleData.id
              });
          }
        }
      } catch (roleError) {
        console.error("Role update error:", roleError);
        // Continue with the update even if role assignment fails
      }
    }
    
    // Record the profile update in team history
    try {
      const currentUserData = await supabase.auth.getUser();
      const currentUser = currentUserData?.data?.user;
      
      if (currentUser) {
        // Get current user profile for name
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', currentUser.id)
          .single();
  
        const currentUserName = currentProfile 
          ? `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim() 
          : 'Unknown user';
          
        // Record in team history
        await supabase.rpc('record_team_history', {
          profile_id_param: userId,
          action_type_param: 'profile_updated',
          action_by_param: currentUser.id,
          action_by_name_param: currentUserName,
          details_param: {
            fields_updated: Object.keys(values),
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (historyError) {
      console.error("Failed to record team history:", historyError);
      // Continue even if history recording fails
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error updating user profile:', err);
    return { 
      success: false,
      error: err instanceof Error ? err.message : 'An unknown error occurred'
    };
  }
};

/**
 * Handles showing the appropriate toast message after a profile update
 */
export const showProfileUpdateToast = (
  success: boolean, 
  roleMessage?: string
) => {
  if (!success) {
    toast({
      title: "Update failed",
      description: "Could not update team member information. Please try again.",
      variant: "destructive",
    });
    return;
  }
  
  if (roleMessage) {
    // Role message is present, so include it in the toast
    const isWarning = roleMessage.includes("failed") || 
                      roleMessage.includes("permission") || 
                      roleMessage.includes("Could not");
    
    toast({
      title: "Profile updated",
      description: `Team member information has been updated. ${roleMessage}`,
      variant: isWarning ? "warning" : "default",
    });
  } else {
    // No role message, just a basic success toast
    toast({
      title: "Profile updated",
      description: "Team member information has been updated successfully.",
    });
  }
};
