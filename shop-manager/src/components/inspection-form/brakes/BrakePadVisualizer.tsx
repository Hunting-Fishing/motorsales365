
import React from 'react';

interface BrakePadVisualizerProps {
  currentThickness: number;
  originalThickness: number;
}

const calculateWearPercentage = (current: number, original: number) => {
  if (original <= 0) return 0;
  const worn = original - current;
  const percentage = (worn / original) * 100;
  return Math.min(Math.max(percentage, 0), 100); // Clamp between 0-100%
};

export const BrakePadVisualizer: React.FC<BrakePadVisualizerProps> = ({ 
  currentThickness, 
  originalThickness 
}) => {
  const wearPercentage = calculateWearPercentage(currentThickness, originalThickness);
  
  return (
    <div className="space-y-2">
      <div className="relative h-14 bg-gray-100 rounded-md overflow-hidden shadow-inner mt-4">
        <div 
          className={`absolute top-0 left-0 h-full rounded-md ${
            currentThickness >= 6
              ? "bg-gradient-to-r from-green-400 to-green-500" 
              : currentThickness >= 4
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-red-400 to-red-500"
          } transition-all duration-300 ease-in-out`}
          style={{ width: `${wearPercentage}%` }}
        />
        <div className="absolute top-0 right-0 h-full flex items-center">
          <div className="h-14 w-2 bg-gray-700 rounded-sm shadow-md"></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex items-center">
          <div className="h-full flex items-center justify-center w-full text-sm font-medium text-gray-800">
            {currentThickness} mm of {originalThickness} mm
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-500 mt-2 text-center">
        Minimum safe thickness: 3mm
      </div>
    </div>
  );
};
