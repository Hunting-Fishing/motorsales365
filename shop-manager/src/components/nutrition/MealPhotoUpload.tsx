import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  onPhotoUploaded: (url: string) => void;
  existingUrl?: string;
  clientId: string;
}

export default function MealPhotoUpload({ onPhotoUploaded, existingUrl, clientId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [lightbox, setLightbox] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${clientId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('meal-photos').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('meal-photos').getPublicUrl(path);
      setPreview(publicUrl);
      onPhotoUploaded(publicUrl);
    } catch (e: any) {
      console.error('Upload error:', e);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onPhotoUploaded('');
  };

  return (
    <div className="space-y-2">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Meal"
            className="w-20 h-20 object-cover rounded-lg cursor-pointer border border-border"
            onClick={() => setLightbox(true)}
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
            {uploading ? 'Uploading…' : 'Add Photo'}
          </Button>
        </div>
      )}

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-lg p-2">
          {preview && <img src={preview} alt="Meal photo" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
