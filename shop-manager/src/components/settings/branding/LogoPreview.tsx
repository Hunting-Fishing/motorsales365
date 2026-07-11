
import { Separator } from "@/components/ui/separator";

interface LogoPreviewProps {
  logoPreview: string | null;
}

export function LogoPreview({ logoPreview }: LogoPreviewProps) {
  return (
    <>
      <Separator className="my-4" />
      <div>
        <h3 className="font-medium mb-4">Logo Preview</h3>
        <div className="border rounded-md p-4 flex items-center justify-center bg-gray-50 min-h-32">
          {logoPreview ? (
            <img 
              src={logoPreview} 
              alt="Uploaded logo" 
              className="max-h-24 max-w-full object-contain" 
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <p>No logo uploaded</p>
              <p className="text-xs mt-1">Your company name will be displayed as text</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
