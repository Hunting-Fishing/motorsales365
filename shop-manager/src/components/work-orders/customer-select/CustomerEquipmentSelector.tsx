
import React, { useState } from 'react';
import { Customer, CustomerVehicle } from '@/types/customer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Truck, Wrench, Plus, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddVehicleDialog } from '@/components/customers/vehicles/AddVehicleDialog';

interface CustomerEquipmentSelectorProps {
  customer: Customer;
  onSelectEquipment: (equipment: SelectedEquipment) => void;
  onAddNewEquipment: () => void;
}

export interface SelectedEquipment {
  id?: string;
  type: 'vehicle' | 'equipment';
  name: string;
  details: {
    make?: string;
    model?: string;
    year?: string | number;
    vin?: string;
    license_plate?: string;
    equipment_type?: string;
    serial_number?: string;
  };
}

export const CustomerEquipmentSelector: React.FC<CustomerEquipmentSelectorProps> = ({
  customer,
  onSelectEquipment,
  onAddNewEquipment
}) => {
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const vehicles = customer.vehicles || [];

  const handleSelectVehicle = (vehicle: CustomerVehicle) => {
    const equipment: SelectedEquipment = {
      id: vehicle.id,
      type: 'vehicle',
      name: `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim(),
      details: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        license_plate: vehicle.license_plate
      }
    };
    onSelectEquipment(equipment);
  };

  const getVehicleIcon = (vehicle: CustomerVehicle) => {
    // Simple logic to determine icon based on vehicle type
    const make = (vehicle.make || '').toLowerCase();
    if (make.includes('truck') || make.includes('ford f-') || make.includes('chevy silverado')) {
      return <Truck className="h-5 w-5" />;
    }
    return <Car className="h-5 w-5" />;
  };

  if (vehicles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            No Vehicles or Equipment Found
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            This customer doesn't have any vehicles or equipment registered yet.
          </p>
          <div className="flex gap-2 justify-center">
            <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <AddVehicleDialog
                  customerId={customer.id}
                  onClose={() => setShowAddVehicle(false)}
                  onVehicleAdded={(vehicle) => {
                    setShowAddVehicle(false);
                    handleSelectVehicle(vehicle);
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={onAddNewEquipment}>
              <Wrench className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Select Vehicle or Equipment
          </span>
          <div className="flex gap-2">
            <Dialog open={showAddVehicle} onOpenChange={setShowAddVehicle}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <AddVehicleDialog
                  customerId={customer.id}
                  onClose={() => setShowAddVehicle(false)}
                  onVehicleAdded={(vehicle) => {
                    setShowAddVehicle(false);
                    handleSelectVehicle(vehicle);
                  }}
                />
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={onAddNewEquipment}>
              <Wrench className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {vehicles.map((vehicle, index) => (
            <div
              key={vehicle.id || index}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleSelectVehicle(vehicle)}
            >
              <div className="flex items-center gap-3">
                {getVehicleIcon(vehicle)}
                <div>
                  <div className="font-medium">
                    {vehicle.year || ''} {vehicle.make || ''} {vehicle.model || ''}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                    {vehicle.vin && (
                      <span>VIN: {vehicle.vin.slice(-6)}</span>
                    )}
                    {vehicle.license_plate && (
                      <Badge variant="outline" className="text-xs">
                        {vehicle.license_plate}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
