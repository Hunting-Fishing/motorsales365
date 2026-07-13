
import { supabase } from '@/integrations/supabase/client';

// Define the ChatFileInfo type
export interface ChatFileInfo {
  url: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'document';
  name: string;
  size: number;
  contentType: string;
}

// Function to upload files to storage and return file info
export const uploadChatFile = async (roomId: string, file: File): Promise<ChatFileInfo> => {
  try {
    // Create a unique file path using roomId and timestamp
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${roomId}/${fileName}`;
    
    // Upload file to Supabase storage
    const { data, error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(filePath);
    
    // Determine file type
    let type: ChatFileInfo['type'] = 'file';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
    } else if (
      file.type === 'application/pdf' || 
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      type = 'document';
    }
    
    // Return file info
    return {
      url: publicUrl,
      type,
      name: file.name,
      size: file.size,
      contentType: file.type
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('File upload failed');
  }
};
