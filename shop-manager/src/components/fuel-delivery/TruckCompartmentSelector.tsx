import React from 'react';
import { cn } from '@/lib/utils';
import { Fuel, Droplet } from 'lucide-react';
import { TruckCompartment } from '@/hooks/useTruckCompartments';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

interface TruckCompartmentSelectorProps {
  compartments: TruckCompartment[];
  selectedCompartmentId: string | null;
  onSelect: (compartment: TruckCompartment) => void;
  filterByProductId?: string | null;
  className?: string;
}

export function TruckCompartmentSelector({
  compartments,
  selectedCompartmentId,
  onSelect,
  filterByProductId,
  className
}: TruckCompartmentSelectorProps) {
  const { formatVolume, convertFromGallons } = useFuelUnits();
  
  // Filter compartments if a product filter is provided
  const filteredCompartments = filterByProductId
    ? compartments.filter(c => c.product_id === filterByProductId)
    : compartments;

  const getPercentage = (compartment: TruckCompartment) => {
    if (!compartment.capacity_gallons) return 0;
    return Math.round((compartment.current_level_gallons / compartment.capacity_gallons) * 100);
  };

  const getFuelColor = (fuelType: string | null | undefined) => {
    switch (fuelType) {
      case 'gasoline':
        return 'bg-amber-500';
      case 'diesel':
        return 'bg-yellow-600';
      case 'heating_oil':
        return 'bg-orange-500';
      case 'propane':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (filteredCompartments.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Fuel className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">
          {filterByProductId 
            ? "No compartments with this product" 
            : "No compartments available"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {filteredCompartments.map((compartment) => {
        const percentage = getPercentage(compartment);
        const isSelected = selectedCompartmentId === compartment.id;
        const fuelColor = getFuelColor(compartment.product?.fuel_type);
        
        return (
          <button
            key={compartment.id}
            type="button"
            onClick={() => onSelect(compartment)}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all text-left",
              "hover:border-primary/50 hover:shadow-md",
              isSelected 
                ? "border-primary bg-primary/5 shadow-md" 
                : "border-border bg-card"
            )}
          >
            {/* Tank visual */}
            <div className="relative h-20 bg-muted rounded-lg overflow-hidden mb-3">
              {/* Fuel level */}
              <div 
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-all",
                  fuelColor
                )}
                style={{ height: `${percentage}%` }}
              />
              
              {/* Tank outline */}
              <div className="absolute inset-0 border-2 border-muted-foreground/20 rounded-lg" />
              
              {/* Level indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-lg text-foreground drop-shadow-sm">
                  {percentage}%
                </span>
              </div>
            </div>
            
            {/* Tank info */}
            <div className="space-y-1">
              <div className="font-medium text-sm">
                {compartment.compartment_name || `Tank ${compartment.compartment_number}`}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Droplet className="h-3 w-3" />
                <span>
                  {formatVolume(compartment.current_level_gallons, 0)} / {formatVolume(compartment.capacity_gallons, 0)}
                </span>
              </div>
              
              {compartment.product && (
                <div className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  fuelColor,
                  "text-white"
                )}>
                  {compartment.product.product_code}
                </div>
              )}
            </div>
            
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                <svg className="h-2.5 w-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
