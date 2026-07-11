import { supabase } from '@/integrations/supabase/client';

export const uploadReviewImage = async (file: File, userId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `review-images/${fileName}`;

    const { data, error } = await supabase.storage
      .from('review-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('review-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading review image:', error);
    throw error;
  }
};

export const deleteReviewImage = async (url: string): Promise<void> => {
  try {
    // Extract filename from URL
    const fileName = url.split('/').pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from('review-images')
      .remove([fileName]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting review image:', error);
    throw error;
  }
};