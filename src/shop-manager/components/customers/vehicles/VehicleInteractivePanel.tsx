import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { VehicleBodyStyle } from '@/types/vehicleBodyStyles';

interface DamageArea {
  id: string;
  name: string;
  isDamaged: boolean;
  damageType: string | null;
  notes: string;
}

interface VehicleInteractivePanelProps {
  vehicleType: VehicleBodyStyle;
  damageAreas: DamageArea[];
  onAreaClick: (areaId: string) => void;
}

interface VehicleArea {
  id: string;
  name: string;
  coordinates: string; // SVG polygon points
}

// Define clickable areas for each vehicle type
const vehicleAreasMap: Record<VehicleBodyStyle, VehicleArea[]> = {
  sedan: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 285,120, 285,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Trunk', coordinates: '285,140, 345,140, 345,180, 285,180' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  hatchback: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 285,120, 285,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Hatch', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  suv: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,90, 315,90, 315,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Cargo Area', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  van: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,90, 315,90, 315,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Sliding Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Side Panel', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Cargo Area', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear Doors', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  truck: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 245,120, 245,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 245,140, 245,160, 175,160' },
    { id: 'left_front_door', name: 'Driver Door', coordinates: '175,180, 175,260, 210,260, 210,180' },
    { id: 'right_front_door', name: 'Passenger Door', coordinates: '210,180, 210,260, 245,260, 245,180' },
    { id: 'truck_bed', name: 'Truck Bed', coordinates: '245,140, 345,140, 345,260, 245,260' },
    { id: 'rear', name: 'Tailgate', coordinates: '245,260, 345,260, 345,300, 245,300' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '245,180, 285,180, 285,250, 245,250' },
  ],
  coupe: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 285,120, 285,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'trunk', name: 'Trunk', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  convertible: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Convertible Top', coordinates: '175,120, 285,120, 285,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'trunk', name: 'Trunk', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  wagon: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 285,120, 285,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Cargo Area', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear Gate', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  crossover: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,90, 315,90, 315,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Cargo Area', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  minivan: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,90, 315,90, 315,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Sliding Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Sliding Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'trunk', name: 'Cargo Area', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear Door', coordinates: '315,180, 345,180, 345,260, 315,260' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  pickup: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 245,120, 245,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 245,140, 245,160, 175,160' },
    { id: 'left_front_door', name: 'Driver Door', coordinates: '175,180, 175,260, 210,260, 210,180' },
    { id: 'right_front_door', name: 'Passenger Door', coordinates: '210,180, 210,260, 245,260, 245,180' },
    { id: 'truck_bed', name: 'Truck Bed', coordinates: '245,140, 345,140, 345,260, 245,260' },
    { id: 'rear', name: 'Tailgate', coordinates: '245,260, 345,260, 345,300, 245,300' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '245,180, 285,180, 285,250, 245,250' },
  ],
  motorcycle: [
    { id: 'front_wheel', name: 'Front Wheel', coordinates: '175,180, 215,180, 215,220, 175,220' },
    { id: 'rear_wheel', name: 'Rear Wheel', coordinates: '275,180, 315,180, 315,220, 275,220' },
    { id: 'gas_tank', name: 'Gas Tank', coordinates: '225,140, 275,140, 275,180, 225,180' },
    { id: 'seat', name: 'Seat', coordinates: '225,180, 275,180, 275,200, 225,200' },
    { id: 'engine', name: 'Engine', coordinates: '225,200, 275,200, 275,220, 225,220' },
    { id: 'handlebars', name: 'Handlebars', coordinates: '175,140, 225,140, 225,160, 175,160' },
  ],
  bus: [
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,90, 315,90, 315,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'driver_door', name: 'Driver Door', coordinates: '175,180, 175,260, 210,260, 210,180' },
    { id: 'passenger_doors', name: 'Passenger Doors', coordinates: '210,180, 210,260, 285,260, 285,180' },
    { id: 'left_side', name: 'Left Side', coordinates: '175,180, 175,260, 285,260, 285,180' },
    { id: 'right_side', name: 'Right Side', coordinates: '285,180, 285,260, 345,260, 345,180' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
  ],
  "off-road": [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,90, 315,90, 315,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'left_rear_door', name: 'Left Rear Door', coordinates: '215,180, 215,260, 245,260, 245,180' },
    { id: 'right_rear_door', name: 'Right Rear Door', coordinates: '285,180, 285,260, 315,260, 315,180' },
    { id: 'left_front_fender', name: 'Left Front Fender', coordinates: '140,180, 175,180, 175,250, 140,250' },
    { id: 'right_front_fender', name: 'Right Front Fender', coordinates: '285,180, 315,180, 315,250, 285,250' },
  ],
  other: [
    { id: 'hood', name: 'Hood', coordinates: '175,140, 230,120, 285,140, 285,180, 175,180' },
    { id: 'front', name: 'Front', coordinates: '175,180, 285,180, 285,230, 175,230' },
    { id: 'roof', name: 'Roof', coordinates: '175,120, 285,120, 285,140, 175,140' },
    { id: 'windshield', name: 'Windshield', coordinates: '175,140, 285,140, 285,160, 175,160' },
    { id: 'left_front_door', name: 'Left Front Door', coordinates: '175,180, 175,260, 215,260, 215,180' },
    { id: 'right_front_door', name: 'Right Front Door', coordinates: '245,180, 245,260, 285,260, 285,180' },
    { id: 'trunk', name: 'Trunk/Cargo', coordinates: '285,140, 345,140, 345,260, 285,260' },
    { id: 'rear', name: 'Rear', coordinates: '315,180, 345,180, 345,260, 315,260' },
  ]
};

// Get vehicle image based on vehicle type
const getVehicleImage = (vehicleType: VehicleBodyStyle): string => {
  switch (vehicleType) {
    case 'sedan':
    case 'coupe':
    case 'convertible':
    case 'other':
      return '/lovable-uploads/bd96d9af-12db-494e-8e7f-609805c801a0.png';
    case 'hatchback':
    case 'wagon':
      return '/lovable-uploads/aa1d5122-b95b-4b2e-9109-0d70e0808da6.png';
    case 'suv':
    case 'van':
    case 'minivan':
    case 'crossover':
      return '/lovable-uploads/332913db-cb57-4dbd-b290-3925552a3911.png';
    case 'truck':
    case 'pickup':
      return '/lovable-uploads/57aefd54-8d89-4b93-b523-5bd2474d84af.png';
    default:
      return '/lovable-uploads/bd96d9af-12db-494e-8e7f-609805c801a0.png'; // Default to sedan
  }
};

// Get vehicle type display name
const getVehicleTypeDisplayName = (vehicleType: VehicleBodyStyle): string => {
  switch (vehicleType) {
    case 'sedan': return 'Sedan';
    case 'hatchback': return 'Hatchback';
    case 'suv': return 'SUV';
    case 'van': return 'Van';
    case 'truck': return 'Truck';
    case 'coupe': return 'Coupe';
    case 'convertible': return 'Convertible';
    case 'wagon': return 'Wagon';
    case 'crossover': return 'Crossover';
    case 'minivan': return 'Minivan';
    case 'pickup': return 'Pickup';
    case 'motorcycle': return 'Motorcycle';
    case 'off-road': return 'Off-road';
    case 'bus': return 'Bus';
    default: return 'Vehicle';
  }
};

const VehicleInteractivePanel: React.FC<VehicleInteractivePanelProps> = ({ 
  vehicleType, 
  damageAreas, 
  onAreaClick 
}) => {
  // Get the appropriate areas for this vehicle type
  const vehicleAreas = vehicleAreasMap[vehicleType] || vehicleAreasMap.sedan;
  
  // Get damage status for an area
  const getAreaDamageStatus = (areaId: string) => {
    const area = damageAreas.find(a => a.id === areaId);
    return area?.isDamaged || false;
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-center">
        <Badge variant="secondary" className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200">
          {getVehicleTypeDisplayName(vehicleType)}
        </Badge>
      </div>

      {/* Vehicle Diagram Container */}
      <div className="relative aspect-square border rounded-lg overflow-hidden bg-gray-50">
        {/* Vehicle image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={getVehicleImage(vehicleType)}
            alt={`${vehicleType} vehicle diagram`}
            className="max-w-full max-h-full object-contain"
            style={{ opacity: 0.5 }} // Dim the image to make the clickable areas more visible
          />
        </div>

        {/* Clickable areas */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 500 500" 
          preserveAspectRatio="xMidYMid meet"
        >
          {vehicleAreas.map((area) => {
            const isDamaged = getAreaDamageStatus(area.id);
            return (
              <polygon 
                key={area.id}
                points={area.coordinates}
                className={`cursor-pointer transition-all duration-200 hover:opacity-70 ${
                  isDamaged 
                    ? 'fill-amber-500 stroke-amber-700 opacity-60' 
                    : 'fill-blue-400 stroke-blue-500 opacity-20 hover:opacity-40'
                }`}
                strokeWidth="1"
                onClick={() => onAreaClick(area.id)}
              />
            );
          })}
        </svg>

        {/* Damage indicators */}
        {damageAreas.filter(area => area.isDamaged).map(area => {
          const vehicleArea = vehicleAreas.find(va => va.id === area.id);
          if (!vehicleArea) return null;
          
          // Calculate center point of polygon to place indicator
          const points = vehicleArea.coordinates.split(',').map(Number);
          const xPoints = [];
          const yPoints = [];
          
          for (let i = 0; i < points.length; i += 2) {
            xPoints.push(points[i]);
            yPoints.push(points[i + 1]);
          }
          
          const xAvg = xPoints.reduce((a, b) => a + b, 0) / xPoints.length;
          const yAvg = yPoints.reduce((a, b) => a + b, 0) / yPoints.length;
          
          return (
            <div 
              key={area.id}
              className="absolute flex items-center justify-center"
              style={{ 
                left: `${(xAvg / 500) * 100}%`, 
                top: `${(yAvg / 500) * 100}%`, 
                transform: 'translate(-50%, -50%)' 
              }}
            >
              <div className="bg-white rounded-full p-1 shadow-md">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 border border-amber-600 rounded"></div>
          <span className="text-sm">Damaged Area</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 opacity-50 border border-blue-500 rounded"></div>
          <span className="text-sm">Clickable Area</span>
        </div>
      </div>
    </div>
  );
};

export default VehicleInteractivePanel;
