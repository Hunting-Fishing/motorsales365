
import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Check, AlertCircle, Gauge } from "lucide-react";

interface TireTreadCardProps {
  position: string;
}

const TireTreadCard: React.FC<TireTreadCardProps> = ({ position }) => {
  const [treadDepth, setTreadDepth] = useState<number[]>([6]);
  
  const getTreadStatus = (depth: number) => {
    if (depth >= 6) {
      return { 
        status: "Good", 
        color: "text-green-600", 
        bgColor: "bg-green-100 border-green-200",
        borderColor: "border-green-300",
        icon: <Check className="h-5 w-5" />
      };
    } else if (depth >= 3) {
      return { 
        status: "Fair", 
        color: "text-amber-600", 
        bgColor: "bg-amber-100 border-amber-200",
        borderColor: "border-amber-300",
        icon: <AlertTriangle className="h-5 w-5" />
      };
    } else {
      return { 
        status: "Replace", 
        color: "text-red-600", 
        bgColor: "bg-red-100 border-red-200",
        borderColor: "border-red-300",
        icon: <AlertCircle className="h-5 w-5" />
      };
    }
  };
  
  const treadStatus = getTreadStatus(treadDepth[0]);
  
  // Calculate the rotation angle based on tread depth (0-10mm)
  const gaugeRotation = -90 + (treadDepth[0] / 10) * 180;
  
  return (
    <div className={`border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-lg ${treadStatus.bgColor} ${treadStatus.borderColor}`}>
      <div className="flex justify-between items-center mb-3">
        <Label className="text-lg font-medium">{position}</Label>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white shadow-sm border ${treadStatus.color}`}>
          {treadStatus.icon}
          <span className="font-medium">{treadStatus.status}</span>
        </div>
      </div>
      
      <div className="space-y-5">
        {/* Gauge visualization */}
        <div className="relative h-32 flex justify-center items-center mt-2 mb-4">
          <div className="absolute w-28 h-28 rounded-full border-8 border-gray-200 flex justify-center items-center">
            <div 
              className={`absolute bottom-0 left-1/2 w-1 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-full origin-bottom transform -translate-x-1/2 shadow-md`}
              style={{ transform: `translateX(-50%) rotate(${gaugeRotation}deg)` }}
            >
              <div className="absolute -top-1 left-1/2 w-3 h-3 rounded-full bg-white border-2 border-purple-600 transform -translate-x-1/2"></div>
            </div>
            <Gauge className="h-6 w-6 text-gray-400 absolute top-9" />
          </div>
          
          {/* Gauge markings */}
          <div className="absolute w-36 h-36 top-[-2px] left-[-4px]">
            <div className="absolute top-24 left-0 text-xs font-medium text-red-500">0mm</div>
            <div className="absolute top-4 left-16 text-xs font-medium text-green-500">10mm</div>
            <div className="absolute top-24 left-32 text-xs font-medium text-amber-500">5mm</div>
          </div>
          
          {/* Digital readout */}
          <div className="absolute -bottom-2 w-full flex justify-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse-subtle">
              {treadDepth[0]}mm
            </div>
          </div>
        </div>
        
        <div className="pt-2">
          <Slider
            value={treadDepth}
            min={0}
            max={10}
            step={0.5}
            onValueChange={setTreadDepth}
            className="mb-4"
          />
          <div className="flex justify-between text-xs">
            <span className="text-red-500 font-medium">0mm</span>
            <span className="text-amber-500 font-medium">5mm</span>
            <span className="text-green-500 font-medium">10mm</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              treadDepth[0] >= 6 
                ? "bg-gradient-to-r from-green-400 to-green-500" 
                : treadDepth[0] >= 3 
                  ? "bg-gradient-to-r from-amber-400 to-amber-500" 
                  : "bg-gradient-to-r from-red-400 to-red-500"
            } transition-all duration-300 ease-in-out`}
            style={{ width: `${(treadDepth[0] / 10) * 100}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center bg-white rounded-lg px-4 py-3 shadow-sm border transition-all hover:shadow-md">
          <span className="text-sm font-medium text-gray-600">Tread Status</span>
          <div className={`text-sm font-bold px-3 py-1 rounded-full ${treadStatus.bgColor} ${treadStatus.color}`}>
            {treadStatus.status}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TireTreadCard;
