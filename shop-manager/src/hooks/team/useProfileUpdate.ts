
import { useState, useCallback } from 'react';
import { updateUserProfile, showProfileUpdateToast } from '@/utils/profileUtils';

/**
 * Hook for handling profile information updates
 */
export function useProfileUpdate() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (
    memberId: string,
    profileData: {
      name: string;
      email: string;
      phone?: string;
      jobTitle?: string;
      department?: string;
      notes?: string;
    }
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Updating profile information for:", memberId);
      
      // Update the user's profile information
      const result = await updateUserProfile(memberId, profileData);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to update profile");
      }
      
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    updateProfile,
    isLoading,
    error,
    resetError: useCallback(() => setError(null), [])
  };
}
