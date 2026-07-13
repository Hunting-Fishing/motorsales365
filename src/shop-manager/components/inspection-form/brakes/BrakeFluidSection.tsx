
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { FluidCondition } from './FluidCondition';

interface BrakeFluidSectionProps {
  brakeFluid: {
    level: 'full' | 'low' | 'critical';
    condition: 'clear' | 'dirty' | 'contaminated';
    lastChanged: string;
  };
  onBrakeFluidChange: (key: 'level' | 'condition' | 'lastChanged', value: string) => void;
}

export const BrakeFluidSection: React.FC<BrakeFluidSectionProps> = ({
  brakeFluid,
  onBrakeFluidChange
}) => {
  const levelOptions = [
    { value: 'full', label: 'Full', status: 'success' as const },
    { value: 'low', label: 'Low', status: 'warning' as const },
    { value: 'critical', label: 'Critically Low', status: 'error' as const }
  ];

  const conditionOptions = [
    { value: 'clear', label: 'Clear', status: 'success' as const },
    { value: 'dirty', label: 'Dirty/Dark', status: 'warning' as const },
    { value: 'contaminated', label: 'Contaminated', status: 'error' as const }
  ];

  return (
    <Card className="border-2 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Gauge className="h-5 w-5" /> Brake Fluid
        </h3>
      </div>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FluidCondition
            title="Fluid Level"
            options={levelOptions}
            value={brakeFluid.level}
            onChange={(value) => onBrakeFluidChange('level', value)}
            id="fluid"
          />
          
          <FluidCondition
            title="Fluid Condition"
            options={conditionOptions}
            value={brakeFluid.condition}
            onChange={(value) => onBrakeFluidChange('condition', value)}
            id="fluid"
          />
        </div>
      </CardContent>
    </Card>
  );
};
