
import { Button } from "@/components/ui/button";

interface ColorPreviewProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
}

export function ColorPreview({ colors }: ColorPreviewProps) {
  return (
    <div className="mt-6">
      <h3 className="font-medium mb-2">Preview</h3>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex space-x-2">
          <div 
            className="w-16 h-16 rounded-md border" 
            style={{ backgroundColor: colors.primary }}
          ></div>
          <div 
            className="w-16 h-16 rounded-md border" 
            style={{ backgroundColor: colors.secondary }}
          ></div>
          <div 
            className="w-16 h-16 rounded-md border" 
            style={{ backgroundColor: colors.accent }}
          ></div>
        </div>
        
        <div className="border rounded-md p-4">
          <div className="mb-2" style={{ color: colors.text }}>
            Sample text in your selected text color
          </div>
          <Button 
            className="mr-2" 
            style={{ 
              backgroundColor: colors.primary,
              color: "#fff"
            }}
          >
            Primary Button
          </Button>
          <Button 
            variant="outline"
            style={{ 
              borderColor: colors.secondary,
              color: colors.secondary
            }}
          >
            Secondary Button
          </Button>
        </div>
      </div>
    </div>
  );
}
