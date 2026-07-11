
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TeamMemberFormValues } from '@/components/team/form/formValidation';
import { recordTeamMemberHistory } from '@/utils/teamHistoryUtils';
import { toast } from '@/hooks/use-toast';

export function useTeamMemberUpdate() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTeamMember = async (
    memberId: string,
    formData: TeamMemberFormValues,
    originalData?: TeamMemberFormValues
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Update the profile record
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          job_title: formData.jobTitle,
          department: formData.department,
        })
        .eq('id', memberId);

      if (updateError) {
        throw updateError;
      }

      // Get user info for history record
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get the current user's name from profiles
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      const currentUserName = currentUserProfile 
        ? `${currentUserProfile.first_name || ''} ${currentUserProfile.last_name || ''}`.trim() 
        : 'Unknown User';

      // Record the profile update in history
      await recordTeamMemberHistory({
        profile_id: memberId,
        action_type: 'profile_update',
        action_by: user?.id || 'unknown',
        action_by_name: currentUserName,
        details: {
          changes: getChanges(originalData, formData),
          timestamp: new Date().toISOString()
        }
      });

      // If the status changed, record that separately
      if (originalData && originalData.status !== formData.status) {
        await recordTeamMemberHistory({
          profile_id: memberId,
          action_type: 'status_change',
          action_by: user?.id || 'unknown',
          action_by_name: currentUserName,
          details: {
            from: originalData.status ? 'Active' : 'Inactive',
            to: formData.status ? 'Active' : 'Inactive',
            timestamp: new Date().toISOString()
          }
        });
      }

      toast({
        title: "Team member updated",
        description: "Team member information has been updated successfully."
      });

      return true;
    } catch (err) {
      console.error('Error updating team member:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);

      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive"
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to track what changed between original and new data
  const getChanges = (originalData?: TeamMemberFormValues, newData?: TeamMemberFormValues) => {
    if (!originalData || !newData) return {};
    
    const changes: Record<string, { from: any, to: any }> = {};
    
    (Object.keys(newData) as Array<keyof TeamMemberFormValues>).forEach(key => {
      if (originalData[key] !== newData[key]) {
        changes[key] = {
          from: originalData[key],
          to: newData[key]
        };
      }
    });
    
    return changes;
  };

  return { updateTeamMember, isLoading, error };
}
