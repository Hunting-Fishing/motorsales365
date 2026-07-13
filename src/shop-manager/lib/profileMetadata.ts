
import { supabase } from '@/lib/supabase';

export interface ProfileMetadata {
  is_active?: boolean;
  status?: string;
  last_login?: string;
  preferences?: Record<string, any>;
  notes?: string;
  [key: string]: any;
}

export async function updateProfileMetadata(profileId: string, metadata: ProfileMetadata) {
  try {
    const { data, error } = await supabase
      .from('profile_metadata')
      .upsert({
        profile_id: profileId,
        metadata: metadata as any
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating profile metadata:', error);
    return { success: false, error: error.message };
  }
}

export async function saveProfileMetadata(profileId: string, notes: string) {
  try {
    const { data, error } = await supabase
      .from('profile_metadata')
      .upsert({
        profile_id: profileId,
        metadata: { notes } as any
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error saving profile metadata:', error);
    return false;
  }
}

export async function getProfileMetadata(profileId: string): Promise<ProfileMetadata | null> {
  try {
    const { data, error } = await supabase
      .from('profile_metadata')
      .select('metadata')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found
        return null;
      }
      throw error;
    }

    // Safely handle the metadata property
    if (data && data.metadata && typeof data.metadata === 'object' && data.metadata !== null) {
      return data.metadata as ProfileMetadata;
    }

    return null;
  } catch (error: any) {
    console.error('Error fetching profile metadata:', error);
    return null;
  }
}

export async function deleteProfileMetadata(profileId: string) {
  try {
    const { error } = await supabase
      .from('profile_metadata')
      .delete()
      .eq('profile_id', profileId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting profile metadata:', error);
    return { success: false, error: error.message };
  }
}
