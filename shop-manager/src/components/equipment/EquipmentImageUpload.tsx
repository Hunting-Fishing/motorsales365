import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EquipmentImageUploadProps {
  imageUrl?: string | null;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  isUploading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EquipmentImageUpload({
  imageUrl,
  onImageSelect,
  onImageRemove,
  isUploading = false,
  className,
  size = 'md'
}: EquipmentImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onImageSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
  };

  const displayUrl = preview || imageUrl;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div 
        className={cn(
          sizeClasses[size],
          'relative rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors',
          displayUrl && 'border-solid border-primary/30'
        )}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : displayUrl ? (
          <>
            <img 
              src={displayUrl} 
              alt="Equipment" 
              className="w-full h-full object-cover"
            />
            {onImageRemove && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Camera className="h-6 w-6" />
          </div>
        )}
      </div>
      
      {!displayUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="h-3 w-3 mr-1" />
          Add Photo
        </Button>
      )}
    </div>
  );
}
