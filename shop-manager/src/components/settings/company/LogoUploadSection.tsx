
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image } from "lucide-react";

interface LogoUploadSectionProps {
  logoUrl: string;
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LogoUploadSection({ logoUrl, isUploading, onFileUpload }: LogoUploadSectionProps) {
  const [imgError, setImgError] = React.useState(false);
  const [localLogoUrl, setLocalLogoUrl] = React.useState(logoUrl);

  React.useEffect(() => {
    // Reset error state and update local URL when logoUrl changes
    if (logoUrl) {
      setImgError(false);
      setLocalLogoUrl(logoUrl);
    }
  }, [logoUrl]);

  // For debugging
  React.useEffect(() => {
    console.log("LogoUploadSection rendered with logoUrl:", logoUrl);
  }, [logoUrl]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative mb-4 w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
        {localLogoUrl && !imgError ? (
          <img 
            src={localLogoUrl} 
            alt="Company Logo" 
            className="object-contain w-full h-full p-1"
            onError={() => {
              console.error("Logo image failed to load", localLogoUrl);
              setImgError(true);
            }}
          />
        ) : (
          <div className="text-center p-4 text-gray-500">
            <Image className="w-10 h-10 mx-auto mb-2" />
            <span className="text-xs">{imgError ? "Failed to load logo" : "No logo uploaded"}</span>
          </div>
        )}
        {localLogoUrl && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity">
            <span className="text-white opacity-0 hover:opacity-100">Change Logo</span>
          </div>
        )}
      </div>
      <Label
        htmlFor="logo-upload"
        className="cursor-pointer bg-muted hover:bg-muted/80 transition-colors py-1.5 px-3 rounded-md text-sm font-medium"
      >
        {isUploading ? "Uploading..." : localLogoUrl ? "Change Logo" : "Upload Logo"}
      </Label>
      <Input
        id="logo-upload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFileUpload(e);
          
          // Create a temporary local preview
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
              setLocalLogoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        }}
        disabled={isUploading}
      />
      {localLogoUrl && !imgError && (
        <div className="mt-2 text-xs text-muted-foreground max-w-xs overflow-hidden">
          <p className="truncate">Logo URL: {localLogoUrl}</p>
        </div>
      )}
    </div>
  );
}
