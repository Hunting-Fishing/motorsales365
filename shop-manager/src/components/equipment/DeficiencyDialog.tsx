import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useDeficiencyMedia } from '@/hooks/useDeficiencyMedia';
import { Camera, Upload, X, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  fileName: string;
}

interface DeficiencyData {
  reason: string;
  mediaItems: MediaItem[];
}

interface DeficiencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  status: 1 | 2; // 1=Red, 2=Yellow
  initialData?: DeficiencyData;
  onSave: (data: DeficiencyData) => void;
  onCancel: () => void;
}

export function DeficiencyDialog({
  open,
  onOpenChange,
  itemName,
  status,
  initialData,
  onSave,
  onCancel,
}: DeficiencyDialogProps) {
  const [reason, setReason] = useState(initialData?.reason || '');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialData?.mediaItems || []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia, deleteMedia, isUploading } = useDeficiencyMedia();

  const statusLabel = status === 1 ? 'Urgent (Red)' : 'Needs Attention (Yellow)';
  const statusColor = status === 1 ? 'text-red-600' : 'text-yellow-600';

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const result = await uploadMedia(file);
      if (result) {
        setMediaItems(prev => [...prev, result]);
        toast.success(`${result.type === 'video' ? 'Video' : 'Photo'} uploaded`);
      } else {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const handleRemoveMedia = async (index: number) => {
    const item = mediaItems[index];
    await deleteMedia(item.url);
    setMediaItems(prev => prev.filter((_, i) => i !== index));
    toast.success('Media removed');
  };

  const handleSave = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the deficiency');
      return;
    }
    onSave({ reason, mediaItems });
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleCancel();
      else onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Document Deficiency: <span className={statusColor}>{itemName}</span>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Status: <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-base font-medium">
              Reason for Deficiency <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue, what needs to be fixed, and any relevant details..."
              className="min-h-[100px]"
              autoFocus
            />
          </div>

          {/* Media Upload Section */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Photos / Videos (Optional)</Label>
            
            {/* Upload Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>

            {/* Hidden file inputs */}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />

            {/* Media Preview Grid */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {mediaItems.map((item, index) => (
                  <div
                    key={index}
                    className="relative rounded-lg overflow-hidden border bg-muted aspect-square group"
                  >
                    {item.type === 'video' ? (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <Video className="h-8 w-8 text-muted-foreground" />
                        <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 rounded">
                          Video
                        </span>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.fileName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/50 text-white text-xs truncate">
                      {item.fileName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!reason.trim() || isUploading}
            className={status === 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
          >
            Save Deficiency
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
