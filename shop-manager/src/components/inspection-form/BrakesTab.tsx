
import React from 'react';
import { BrakePadCard } from './brakes/BrakePadCard';
import { BrakeRotorsSection } from './brakes/BrakeRotorsSection';
import { BrakeFluidSection } from './brakes/BrakeFluidSection';
import { useBrakesData } from './brakes/useBrakesData';

const BrakesTab = () => {
  const { 
    frontBrakes,
    rearBrakes,
    rotors,
    brakeFluid,
    handleFrontBrakeChange,
    handleRearBrakeChange,
    handleOriginalThicknessChange,
    handleRotorChange,
    handleBrakeFluidChange
  } = useBrakesData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Front Brake Pads Card */}
        <BrakePadCard 
          name={frontBrakes.name}
          thicknessMM={frontBrakes.thicknessMM}
          originalThicknessMM={frontBrakes.originalThicknessMM}
          onThicknessChange={handleFrontBrakeChange}
          onOriginalThicknessChange={(value) => handleOriginalThicknessChange('front', value)}
          gradientColors="from-blue-500 to-purple-600"
        />

        {/* Rear Brake Pads Card */}
        <BrakePadCard 
          name={rearBrakes.name}
          thicknessMM={rearBrakes.thicknessMM}
          originalThicknessMM={rearBrakes.originalThicknessMM}
          onThicknessChange={handleRearBrakeChange}
          onOriginalThicknessChange={(value) => handleOriginalThicknessChange('rear', value)}
          gradientColors="from-purple-600 to-blue-500"
        />
      </div>
      
      {/* Brake Rotors Section */}
      <BrakeRotorsSection 
        rotors={rotors}
        onRotorChange={handleRotorChange}
      />
      
      {/* Brake Fluid Section */}
      <BrakeFluidSection 
        brakeFluid={brakeFluid}
        onBrakeFluidChange={handleBrakeFluidChange}
      />
    </div>
  );
};

export default BrakesTab;
