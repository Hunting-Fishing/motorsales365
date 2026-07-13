import React from "react";
import { Card } from "@/components/ui/card";
import { Car, AlertTriangle } from "lucide-react";
import { VehicleBodyStyle } from "@/types/vehicleBodyStyles";
import { cn } from "@/lib/utils";

interface InteractiveVehicleProps {
  bodyStyle: VehicleBodyStyle;
  className?: string;
}

export const InteractiveVehicle: React.FC<InteractiveVehicleProps> = ({
  bodyStyle = "sedan",
  className,
}) => {
  // Ensure we have a valid body style, default to sedan if not
  const validBodyStyle = ["sedan", "suv", "truck", "coupe", "hatchback", "wagon", "van", "convertible", "minivan", "crossover", "pickup", "bus", "motorcycle", "off-road", "other"].includes(bodyStyle)
    ? bodyStyle
    : "sedan";

  return (
    <Card className={cn("p-4 relative overflow-hidden", className)}>
      <div className="w-full aspect-video flex items-center justify-center">
        {renderVehicleSvg(validBodyStyle)}
      </div>
    </Card>
  );
};

function renderVehicleSvg(bodyStyle: VehicleBodyStyle): React.ReactNode {
  switch (bodyStyle) {
    case "sedan":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,50 C220,40 210,30 200,30 L180,30 L160,10 L80,10 L60,30 L40,30 C30,30 20,40 20,50 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M80,30 L160,30 L160,60 L80,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "suv":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,40 C220,30 210,20 200,20 L180,20 L160,10 L80,10 L60,20 L40,20 C30,20 20,30 20,40 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M80,20 L160,20 L160,60 L80,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
    
    case "truck":
    case "pickup":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L120,80 C130,80 140,70 140,60 L140,40 C140,30 130,20 120,20 L100,20 L80,10 L40,10 L20,20 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <path
            d="M140,60 L220,60 L220,80 L140,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M40,20 L100,20 L100,50 L40,50 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "coupe":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,50 C220,40 210,30 200,30 L180,30 L160,10 L80,10 L40,30 C30,30 20,40 20,50 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M80,30 L160,30 L160,60 L80,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "hatchback":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,30 L180,10 L80,10 L60,30 L40,30 C30,30 20,40 20,50 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M80,30 L160,30 L160,60 L80,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "wagon":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,20 L180,10 L60,10 L40,20 C30,20 20,30 20,40 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M60,20 L180,20 L180,60 L60,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "van":
    case "minivan":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,20 L180,10 L40,10 L20,20 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M40,20 L180,20 L180,60 L40,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "convertible":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,50 C220,40 210,30 200,30 L180,30 L160,30 L80,30 L60,30 L40,30 C30,30 20,40 20,50 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <path
            d="M60,30 L180,30 L170,15 L70,15 Z"
            stroke="#000"
            strokeWidth="1"
            fill="#d1d5db"
            strokeDasharray="4 2"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M80,30 L160,30 L160,60 L80,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "crossover":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,80 L200,80 C210,80 220,70 220,60 L220,35 C220,25 210,20 200,20 L180,20 L160,10 L80,10 L60,20 L40,20 C30,20 20,25 20,35 L20,60 C20,70 30,80 40,80 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M70,20 L170,20 L170,60 L70,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
        </svg>
      );
      
    case "bus":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M20,80 L220,80 L220,20 L20,20 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="15" fill="#1f2937" />
          <circle cx="180" cy="80" r="15" fill="#1f2937" />
          <path
            d="M30,30 L210,30 L210,70 L30,70 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
          <path
            d="M20,20 L40,10 L200,10 L220,20 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
        </svg>
      );
      
    case "motorcycle":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <circle cx="60" cy="80" r="20" stroke="#000" strokeWidth="2" fill="#1f2937" />
          <circle cx="180" cy="80" r="20" stroke="#000" strokeWidth="2" fill="#1f2937" />
          <path
            d="M60,80 L120,40 L180,80"
            stroke="#000"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M120,40 L130,20"
            stroke="#000"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M130,20 L150,20 L140,40"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
        </svg>
      );
      
    case "off-road":
      return (
        <svg
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M40,70 L200,70 C210,70 220,65 220,60 L220,40 C220,35 210,30 200,30 L180,30 L160,20 L80,20 L60,30 L40,30 C30,30 20,35 20,40 L20,60 C20,65 30,70 40,70 Z"
            stroke="#000"
            strokeWidth="2"
            fill="#f3f4f6"
          />
          <circle cx="60" cy="80" r="20" stroke="#000" strokeWidth="2" fill="#1f2937" />
          <circle cx="180" cy="80" r="20" stroke="#000" strokeWidth="2" fill="#1f2937" />
          <path
            d="M80,30 L160,30 L160,60 L80,60 Z"
            fill="#d1e9ff"
            stroke="#000"
          />
          <path
            d="M20,70 L40,70 L40,80 L20,80 Z"
            stroke="#000"
            strokeWidth="1"
            fill="#d1d5db"
          />
          <path
            d="M200,70 L220,70 L220,80 L200,80 Z"
            stroke="#000"
            strokeWidth="1"
            fill="#d1d5db"
          />
        </svg>
      );
      
    default:
      return (
        <div className="flex flex-col items-center justify-center text-amber-500">
          <AlertTriangle className="w-12 h-12 mb-2" />
          <Car className="w-16 h-16" />
          <p className="text-sm mt-2 text-center">Generic Vehicle</p>
        </div>
      );
  }
}
