import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface InspectionPhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function InspectionPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 3,
  disabled = false
}: InspectionPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      toast({
        title: 'Too many photos',
        description: `Maximum ${maxPhotos} photos allowed per item`,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    const newPhotoUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: 'Only images are allowed',
            variant: 'destructive'
          });
          continue;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: 'Images must be under 5MB',
            variant: 'destructive'
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(fileName);

        newPhotoUrls.push(publicUrl);
      }

      onPhotosChange([...photos, ...newPhotoUrls]);
      toast({ title: 'Photos uploaded successfully' });
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photos',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-2">
      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Inspection photo ${index + 1}`}
                className="w-16 h-16 object-cover rounded-md border"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {photos.length < maxPhotos && !disabled && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-3 w-3 mr-1" />
                Add Photo
              </>
            )}
          </Button>
        </div>
      )}

      {/* Photo count */}
      {photos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {photos.length} / {maxPhotos} photos
        </p>
      )}
    </div>
  );
}
