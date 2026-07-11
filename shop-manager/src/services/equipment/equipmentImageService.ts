import { supabase } from '@/integrations/supabase/client';

/**
 * Upload equipment profile image to storage
 */
export async function uploadEquipmentProfileImage(
  file: File, 
  equipmentId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedTypes = ['jpg', 'jpeg', 'png', 'webp'];
  
  if (!fileExt || !allowedTypes.includes(fileExt)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, or WebP images.');
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  const fileName = `profile-images/${equipmentId}_${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('equipment_attachments')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('equipment_attachments')
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Delete equipment profile image from storage
 */
export async function deleteEquipmentProfileImage(imageUrl: string): Promise<void> {
  // Extract file path from URL
  const urlParts = imageUrl.split('/equipment_attachments/');
  if (urlParts.length < 2) return;
  
  const filePath = urlParts[1];
  
  const { error } = await supabase.storage
    .from('equipment_attachments')
    .remove([filePath]);

  if (error) {
    console.error('Delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Update equipment record with profile image URL
 */
export async function updateEquipmentProfileImageUrl(
  equipmentId: string, 
  imageUrl: string | null
): Promise<void> {
  const { error } = await supabase
    .from('equipment_assets')
    .update({ profile_image_url: imageUrl })
    .eq('id', equipmentId);

  if (error) {
    throw new Error(`Failed to update equipment: ${error.message}`);
  }
}
