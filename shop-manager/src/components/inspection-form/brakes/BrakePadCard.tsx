
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Disc } from "lucide-react";
import { BrakeStatusIndicator } from './BrakeStatusIndicator';
import { BrakePadThicknessControl } from './BrakePadThicknessControl';
import { BrakePadVisualizer } from './BrakePadVisualizer';

interface BrakePadCardProps {
  name: string;
  thicknessMM: number;
  originalThicknessMM: number;
  onThicknessChange: (values: number[]) => void;
  onOriginalThicknessChange: (value: string) => void;
  gradientColors: string;
}

export const BrakePadCard: React.FC<BrakePadCardProps> = ({
  name,
  thicknessMM,
  originalThicknessMM,
  onThicknessChange,
  onOriginalThicknessChange,
  gradientColors
}) => {
  return (
    <Card className="border-2 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className={`bg-gradient-to-r ${gradientColors} p-4`}>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Disc className="h-5 w-5" /> {name}
          </h3>
          <BrakeStatusIndicator thicknessMM={thicknessMM} />
        </div>
      </div>
      <CardContent className="pt-6">
        <BrakePadThicknessControl 
          currentThickness={thicknessMM}
          originalThickness={originalThicknessMM}
          onThicknessChange={onThicknessChange}
          onOriginalThicknessChange={onOriginalThicknessChange}
          name={name}
        />
        <BrakePadVisualizer 
          currentThickness={thicknessMM} 
          originalThickness={originalThicknessMM} 
        />
      </CardContent>
    </Card>
  );
};
