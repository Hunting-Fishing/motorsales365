import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JobPhotoUploaderProps {
  jobId: string;
  photoType: 'before' | 'after';
  existingPhotos: string[];
  onPhotosUpdate: (photos: string[]) => void;
}

export function JobPhotoUploader({ 
  jobId, 
  photoType, 
  existingPhotos = [], 
  onPhotosUpdate 
}: JobPhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${jobId}/${photoType}/${Date.now()}-${i}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('power-washing-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('power-washing-photos')
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      const newPhotos = [...existingPhotos, ...uploadedUrls];
      onPhotosUpdate(newPhotos);
      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [jobId, photoType, existingPhotos, onPhotosUpdate]);

  const handleRemovePhoto = useCallback(async (photoUrl: string) => {
    try {
      // Extract path from URL
      const urlParts = photoUrl.split('/power-washing-photos/');
      if (urlParts.length > 1) {
        const path = urlParts[1];
        await supabase.storage.from('power-washing-photos').remove([path]);
      }

      const newPhotos = existingPhotos.filter(p => p !== photoUrl);
      onPhotosUpdate(newPhotos);
      toast.success('Photo removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove photo');
    }
  }, [existingPhotos, onPhotosUpdate]);

  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => handleFileSelect(e as any);
    input.click();
  }, [handleFileSelect]);

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {existingPhotos.map((photo, index) => (
            <div key={index} className="relative aspect-square group">
              <img 
                src={photo} 
                alt={`${photoType} photo ${index + 1}`} 
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => handleRemovePhoto(photo)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      <div className="border-2 border-dashed rounded-lg p-6">
        {isUploading ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Uploading... {Math.round(uploadProgress)}%</p>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              {existingPhotos.length === 0 
                ? `No ${photoType} photos yet` 
                : 'Add more photos'}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCameraCapture}>
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
