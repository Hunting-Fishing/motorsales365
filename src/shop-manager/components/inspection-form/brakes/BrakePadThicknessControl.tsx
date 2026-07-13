
import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BrakePadThicknessControlProps {
  currentThickness: number;
  originalThickness: number;
  onThicknessChange: (value: number[]) => void;
  onOriginalThicknessChange: (value: string) => void;
  name: string;
}

export const BrakePadThicknessControl: React.FC<BrakePadThicknessControlProps> = ({
  currentThickness,
  originalThickness,
  onThicknessChange,
  onOriginalThicknessChange,
  name
}) => {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 mb-4">
        <div className="flex-1">
          <Label htmlFor={`${id}-original`} className="text-sm font-medium mb-1 block">Original Thickness</Label>
          <div className="relative">
            <Input 
              id={`${id}-original`} 
              type="number" 
              min="6" 
              max="12" 
              value={originalThickness}
              onChange={(e) => onOriginalThicknessChange(e.target.value)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">mm</span>
          </div>
        </div>
        <div className="flex-1">
          <Label htmlFor={`${id}-current`} className="text-sm font-medium mb-1 block">Current Thickness</Label>
          <div className="relative">
            <Input 
              id={`${id}-current`} 
              type="number" 
              min="0" 
              max={originalThickness} 
              value={currentThickness}
              onChange={(e) => onThicknessChange([parseInt(e.target.value) || 0])}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">mm</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-2 text-sm">
          <span className="font-medium">Brake Pad Thickness</span>
          <span className="font-bold text-purple-600">{currentThickness} mm</span>
        </div>
        <Slider
          value={[currentThickness]}
          min={0}
          max={originalThickness}
          step={0.5}
          onValueChange={onThicknessChange}
          className="mb-2"
        />
        <div className="flex justify-between text-xs font-medium">
          <span className="text-red-500">0 mm</span>
          <span className="text-amber-500">4 mm</span>
          <span className="text-green-500">{originalThickness} mm</span>
        </div>
      </div>
    </div>
  );
};
