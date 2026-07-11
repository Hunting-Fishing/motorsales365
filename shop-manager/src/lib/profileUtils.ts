import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current user's profile, handling both patterns:
 * - Old: profile.id = auth.uid()
 * - New: profile.user_id = auth.uid()
 */
export async function getCurrentUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    console.error('Error fetching current user profile:', error);
    throw error;
  }
  
  return profile;
}

/**
 * Get the current user's shop_id
 */
export async function getCurrentUserShopId(): Promise<string | null> {
  const profile = await getCurrentUserProfile();
  return profile?.shop_id || null;
}

/**
 * Get a specific field from the current user's profile
 */
export async function getCurrentUserProfileField<T>(field: string): Promise<T | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(field)
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching profile field ${field}:`, error);
    throw error;
  }
  
  return profile ? (profile as any)[field] : null;
}
