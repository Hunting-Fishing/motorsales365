
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";

interface ImageUploadButtonProps {
  label: string;
}

const ImageUploadButton: React.FC<ImageUploadButtonProps> = ({ label }) => {
  const [image, setImage] = useState<string | null>(null);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          setImage(event.target.result as string);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
    setImage(null);
  };
  
  return (
    <div className="border rounded-md overflow-hidden">
      {!image ? (
        <div className="p-3 flex flex-col items-center justify-center min-h-[140px] bg-muted/10">
          <p className="text-sm font-medium mb-2">{label}</p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-[100px] bg-primary/5 hover:bg-primary/10"
              asChild
            >
              <label>
                <Camera className="h-4 w-4 mr-1" />
                <span>Camera</span>
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageUpload} />
              </label>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-[100px] bg-muted/20 hover:bg-muted/30"
              asChild
            >
              <label>
                <Upload className="h-4 w-4 mr-1" />
                <span>Upload</span>
                <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
              </label>
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img 
            src={image} 
            alt={label} 
            className="w-full h-[140px] object-cover"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-90"
            onClick={handleRemoveImage}
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-1.5">
            <p className="text-xs font-medium truncate">{label}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadButton;
