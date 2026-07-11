import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface UploadedMedia {
  url: string;
  type: 'image' | 'video';
  fileName: string;
}

export function useDeficiencyMedia() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMedia = async (file: File): Promise<UploadedMedia | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const isVideo = ['mp4', 'webm', 'mov', 'quicktime'].includes(fileExt) || file.type.startsWith('video/');
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
      
      const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('inspection-deficiency-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-deficiency-media')
        .getPublicUrl(data.path);

      setUploadProgress(100);

      return {
        url: publicUrl,
        type: mediaType,
        fileName: file.name,
      };
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMedia = async (url: string): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlParts = url.split('/inspection-deficiency-media/');
      if (urlParts.length < 2) return false;
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from('inspection-deficiency-media')
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  };

  return {
    uploadMedia,
    deleteMedia,
    isUploading,
    uploadProgress,
  };
}
