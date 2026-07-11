
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Disc2 } from "lucide-react";
import { RotorCondition } from './RotorCondition';

type RotorStatus = 'good' | 'warped' | 'scored' | 'replace';

interface BrakeRotorsSectionProps {
  rotors: {
    frontLeft: RotorStatus;
    frontRight: RotorStatus;
    rearLeft: RotorStatus;
    rearRight: RotorStatus;
  };
  onRotorChange: (position: keyof BrakeRotorsSectionProps['rotors'], value: RotorStatus) => void;
}

export const BrakeRotorsSection: React.FC<BrakeRotorsSectionProps> = ({
  rotors,
  onRotorChange
}) => {
  return (
    <Card className="border-2 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Disc2 className="h-5 w-5" /> Brake Rotors
        </h3>
      </div>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <RotorCondition
              title="Front Left Rotor"
              value={rotors.frontLeft}
              onChange={(value) => onRotorChange('frontLeft', value)}
              id="fl"
            />

            <RotorCondition
              title="Front Right Rotor"
              value={rotors.frontRight}
              onChange={(value) => onRotorChange('frontRight', value)}
              id="fr"
            />
          </div>

          <div className="space-y-6">
            <RotorCondition
              title="Rear Left Rotor"
              value={rotors.rearLeft}
              onChange={(value) => onRotorChange('rearLeft', value)}
              id="rl"
            />

            <RotorCondition
              title="Rear Right Rotor"
              value={rotors.rearRight}
              onChange={(value) => onRotorChange('rearRight', value)}
              id="rr"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
