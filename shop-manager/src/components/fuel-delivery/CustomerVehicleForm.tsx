import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Car, ChevronDown, ChevronUp, Loader2, CheckCircle, X, Fuel, Plus } from 'lucide-react';
import { decodeVin } from '@/services/vinDecoderService';
import { VinDecodeResult } from '@/types/vehicle';
import { estimateTankCapacity, mapFuelTypeToPreference } from '@/utils/tankCapacityEstimator';
import { FuelTypeSelect } from './FuelTypeSelect';

export interface VehicleFormData {
  id: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  fuel_type: string;
  license_plate: string;
  color: string;
  tank_capacity: string;
  body_style: string;
}

interface CustomerVehicleFormProps {
  vehicles: VehicleFormData[];
  onVehiclesChange: (vehicles: VehicleFormData[]) => void;
  onFuelTypeDetected?: (fuelType: string) => void;
}

const createEmptyVehicle = (): VehicleFormData => ({
  id: crypto.randomUUID(),
  vin: '',
  year: '',
  make: '',
  model: '',
  fuel_type: '',
  license_plate: '',
  color: '',
  tank_capacity: '',
  body_style: '',
});

export const CustomerVehicleForm: React.FC<CustomerVehicleFormProps> = ({
  vehicles,
  onVehiclesChange,
  onFuelTypeDetected,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [decodingStates, setDecodingStates] = useState<Record<string, 'idle' | 'decoding' | 'success' | 'error'>>({});

  const handleAddVehicle = () => {
    onVehiclesChange([...vehicles, createEmptyVehicle()]);
    setIsOpen(true);
  };

  const handleRemoveVehicle = (id: string) => {
    onVehiclesChange(vehicles.filter(v => v.id !== id));
  };

  const updateVehicle = (id: string, updates: Partial<VehicleFormData>) => {
    onVehiclesChange(
      vehicles.map(v => v.id === id ? { ...v, ...updates } : v)
    );
  };

  const handleVinChange = async (id: string, vin: string) => {
    const cleanVin = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    updateVehicle(id, { vin: cleanVin });

    if (cleanVin.length === 17) {
      setDecodingStates(prev => ({ ...prev, [id]: 'decoding' }));
      
      try {
        const result = await decodeVin(cleanVin);
        if (result) {
          const tankCapacity = estimateTankCapacity(result.body_style);
          const mappedFuelType = mapFuelTypeToPreference(result.fuel_type);
          
          updateVehicle(id, {
            year: result.year?.toString() || '',
            make: result.make || '',
            model: result.model || '',
            fuel_type: mappedFuelType,
            color: result.color || '',
            body_style: result.body_style || '',
            tank_capacity: tankCapacity.toString(),
          });
          
          if (mappedFuelType && onFuelTypeDetected) {
            onFuelTypeDetected(mappedFuelType);
          }
          
          setDecodingStates(prev => ({ ...prev, [id]: 'success' }));
        } else {
          setDecodingStates(prev => ({ ...prev, [id]: 'error' }));
        }
      } catch (error) {
        console.error('VIN decode error:', error);
        setDecodingStates(prev => ({ ...prev, [id]: 'error' }));
      }
    } else {
      setDecodingStates(prev => ({ ...prev, [id]: 'idle' }));
    }
  };

  const getDecodingIcon = (state: string | undefined) => {
    switch (state) {
      case 'decoding':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <Badge variant="outline" className="text-xs text-amber-600">Manual entry</Badge>;
      default:
        return null;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="col-span-2">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full justify-between gap-2 border-dashed border-orange-300 hover:bg-orange-50"
          >
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-orange-600" />
              <span>Add Vehicle ({vehicles.length})</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-4 space-y-4">
        {vehicles.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg">
            <Car className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-3">No vehicles added yet</p>
            <Button type="button" variant="outline" size="sm" onClick={handleAddVehicle}>
              <Plus className="h-3 w-3 mr-1" />
              Add First Vehicle
            </Button>
          </div>
        ) : (
          vehicles.map((vehicle, index) => (
            <Card key={vehicle.id} className="border-orange-100">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Car className="h-4 w-4 text-orange-500" />
                    Vehicle {index + 1}
                  </h4>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveVehicle(vehicle.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* VIN Input */}
                <div className="space-y-2 mb-4">
                  <Label className="flex items-center gap-2">
                    VIN (17 characters)
                    {getDecodingIcon(decodingStates[vehicle.id])}
                  </Label>
                  <Input
                    value={vehicle.vin}
                    onChange={(e) => handleVinChange(vehicle.id, e.target.value)}
                    placeholder="Enter VIN to auto-decode..."
                    maxLength={17}
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    {vehicle.vin.length}/17 characters
                  </p>
                </div>

                {/* Vehicle Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Input
                      value={vehicle.year}
                      onChange={(e) => updateVehicle(vehicle.id, { year: e.target.value })}
                      placeholder="2024"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Make</Label>
                    <Input
                      value={vehicle.make}
                      onChange={(e) => updateVehicle(vehicle.id, { make: e.target.value })}
                      placeholder="Ford"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input
                      value={vehicle.model}
                      onChange={(e) => updateVehicle(vehicle.id, { model: e.target.value })}
                      placeholder="F-150"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      Fuel Type
                    </Label>
                    <FuelTypeSelect
                      value={vehicle.fuel_type}
                      onChange={(v) => updateVehicle(vehicle.id, { fuel_type: v })}
                      placeholder="Select..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">License Plate</Label>
                    <Input
                      value={vehicle.license_plate}
                      onChange={(e) => updateVehicle(vehicle.id, { license_plate: e.target.value.toUpperCase() })}
                      placeholder="ABC-1234"
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tank Capacity (gal)</Label>
                    <Input
                      type="number"
                      value={vehicle.tank_capacity}
                      onChange={(e) => updateVehicle(vehicle.id, { tank_capacity: e.target.value })}
                      placeholder="20"
                    />
                  </div>
                </div>

                {vehicle.body_style && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Body Style: {vehicle.body_style}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}

        {vehicles.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={handleAddVehicle} className="w-full">
            <Plus className="h-3 w-3 mr-1" />
            Add Another Vehicle
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
