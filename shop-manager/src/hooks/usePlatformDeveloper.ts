import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export interface PlatformDeveloper {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
}

/**
 * Check if the current user is a platform developer (god-mode access)
 */
export function useIsPlatformDeveloper() {
  const { userId, isAuthenticated } = useAuthUser();

  return useQuery({
    queryKey: ['is-platform-developer', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('is_platform_developer', {
        _user_id: userId,
      });

      if (error) {
        console.error('Error checking platform developer status:', error);
        return false;
      }

      return data === true;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Fetch all platform developers (only accessible by platform developers)
 */
export function usePlatformDevelopers() {
  return useQuery({
    queryKey: ['platform-developers'],
    queryFn: async (): Promise<PlatformDeveloper[]> => {
      const { data, error } = await supabase
        .from('platform_developers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching platform developers:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Add a new platform developer
 */
export function useAddPlatformDeveloper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      displayName,
      notes,
    }: {
      email: string;
      displayName?: string;
      notes?: string;
    }) => {
      // First, find the user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        throw new Error(`No user found with email: ${email}`);
      }

      // Add as platform developer
      const { data, error } = await supabase
        .from('platform_developers')
        .insert({
          user_id: profile.id,
          email: email,
          display_name: displayName || profile.full_name,
          notes,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This user is already a platform developer');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-developers'] });
    },
  });
}

/**
 * Update a platform developer
 */
export function useUpdatePlatformDeveloper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
      displayName,
      notes,
    }: {
      id: string;
      isActive?: boolean;
      displayName?: string;
      notes?: string;
    }) => {
      const updates: Record<string, unknown> = {};
      if (isActive !== undefined) updates.is_active = isActive;
      if (displayName !== undefined) updates.display_name = displayName;
      if (notes !== undefined) updates.notes = notes;

      const { data, error } = await supabase
        .from('platform_developers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-developers'] });
      queryClient.invalidateQueries({ queryKey: ['is-platform-developer'] });
    },
  });
}

/**
 * Remove a platform developer
 */
export function useRemovePlatformDeveloper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_developers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-developers'] });
      queryClient.invalidateQueries({ queryKey: ['is-platform-developer'] });
    },
  });
}
