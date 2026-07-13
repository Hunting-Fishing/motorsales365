
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ColorSelector } from "../ColorSelector";
import { ColorPreview } from "./ColorPreview";

interface ColorsTabProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  onColorChange: (colorKey: string, value: string) => void;
}

export function ColorsTab({ colors, onColorChange }: ColorsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Scheme</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ColorSelector 
            label="Primary Color" 
            color={colors.primary} 
            onChange={(value) => onColorChange("primary", value)}
          />
          <ColorSelector 
            label="Secondary Color" 
            color={colors.secondary} 
            onChange={(value) => onColorChange("secondary", value)}
          />
          <ColorSelector 
            label="Accent Color" 
            color={colors.accent} 
            onChange={(value) => onColorChange("accent", value)}
          />
          <ColorSelector 
            label="Text Color" 
            color={colors.text} 
            onChange={(value) => onColorChange("text", value)}
          />
          <ColorSelector 
            label="Background Color" 
            color={colors.background} 
            onChange={(value) => onColorChange("background", value)}
          />
        </div>

        <ColorPreview colors={colors} />
      </CardContent>
    </Card>
  );
}
