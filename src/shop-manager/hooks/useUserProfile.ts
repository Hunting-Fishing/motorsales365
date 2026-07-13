
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/lib/supabase";
import { useAuthUser } from './useAuthUser';
import { useToast } from './use-toast';

export interface UserProfile {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
}

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthUser();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching profile for user ID:", userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, middle_name, last_name, email, phone, job_title')
        .eq('id', userId)
        .single();
        
      if (error) {
        throw error;
      }
      
      console.log("Profile data received:", data);
      
      setUserProfile({
        firstName: data.first_name || '',
        middleName: data.middle_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        jobTitle: data.job_title || ''
      });
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      toast({
        title: "Error loading profile",
        description: "We couldn't load your profile information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setSavingProfile(true);
      setError(null);
      
      console.log("Updating profile with data:", profileData);
      
      // Map the camelCase form values to the snake_case database column names
      const updateData: Record<string, any> = {};
      if ('firstName' in profileData) updateData.first_name = profileData.firstName;
      if ('middleName' in profileData) updateData.middle_name = profileData.middleName;
      if ('lastName' in profileData) updateData.last_name = profileData.lastName;
      if ('email' in profileData) updateData.email = profileData.email;
      if ('phone' in profileData) updateData.phone = profileData.phone;
      if ('jobTitle' in profileData) updateData.job_title = profileData.jobTitle;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);
        
      if (error) {
        throw error;
      }
      
      // Update local state with new values
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          ...profileData
        });
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
        variant: "default",
      });
      
      return { success: true };
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      toast({
        title: "Update Failed",
        description: "Couldn't update your profile. Please try again.",
        variant: "destructive",
      });
      
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      };
    } finally {
      setSavingProfile(false);
    }
  };

  const updateAuthEmail = async (newEmail: string) => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return { success: false, error: 'User not authenticated' };
    }
    
    try {
      setSavingProfile(true);
      
      console.log("Updating auth email to:", newEmail);
      
      const { data, error } = await supabase.functions.invoke('update-user-email', {
        body: { userId, newEmail }
      });
      
      if (error) throw error;
      
      // Refresh the profile to get updated email
      await fetchUserProfile();
      
      toast({
        title: "Email Updated",
        description: "Your email has been updated successfully.",
        variant: "default",
      });
      
      return { success: true };
    } catch (err) {
      console.error("Error updating auth email:", err);
      
      toast({
        title: "Update Failed",
        description: "Couldn't update your email. Please try again.",
        variant: "destructive",
      });
      
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      };
    } finally {
      setSavingProfile(false);
    }
  };

  return {
    userProfile,
    loading,
    savingProfile,
    error,
    fetchUserProfile,
    updateProfile,
    updateAuthEmail
  };
}
