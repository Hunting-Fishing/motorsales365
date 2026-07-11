import React from "react";
import { UseFormReturn } from "react-hook-form";
import { CustomerFormValues } from "./schemas/customerSchema";
import { VehicleSelector } from "./vehicle/VehicleSelector";
import { Button } from "@/components/ui/button";
import { Plus, Car, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface VehiclesFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const VehiclesFields: React.FC<VehiclesFieldsProps> = ({ form }) => {
  const vehicles = form.watch('vehicles') || [];

  const addVehicle = () => {
    const currentVehicles = form.getValues('vehicles') || [];
    form.setValue('vehicles', [
      ...currentVehicles,
      { make: '', model: '', year: '', vin: '', license_plate: '' }
    ]);
    
    // Trigger form validation after adding vehicle
    form.trigger('vehicles');
    console.log('Vehicle added, current vehicles:', [...currentVehicles, { make: '', model: '', year: '', vin: '', license_plate: '' }]);
  };

  const removeVehicle = (index: number) => {
    const currentVehicles = form.getValues('vehicles') || [];
    form.setValue(
      'vehicles',
      currentVehicles.filter((_, i) => i !== index)
    );
    
    // Trigger form validation after removing vehicle
    form.trigger('vehicles');
    console.log('Vehicle removed, remaining vehicles:', currentVehicles.filter((_, i) => i !== index));
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <Car className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Vehicles</h3>
        </div>

        {vehicles.length > 0 ? (
          <Accordion type="multiple" className="space-y-4" defaultValue={['vehicle-0']}>
            {vehicles.map((vehicle, index) => (
              <AccordionItem 
                key={index} 
                value={`vehicle-${index}`}
                className="border rounded-md overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center text-left">
                    <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {vehicle.make || vehicle.model || vehicle.year ? (
                        `${vehicle.year || 'Year'} ${vehicle.make || 'Make'} ${vehicle.model || 'Model'}`
                      ) : (
                        `Vehicle ${index + 1}`
                      )}
                      {vehicle.license_plate && ` - ${vehicle.license_plate}`}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <VehicleSelector
                    form={form}
                    index={index}
                    onRemove={removeVehicle}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-8 border rounded-md border-dashed">
            <Car className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">No vehicles added yet</p>
          </div>
        )}

        <Button 
          type="button" 
          variant="outline" 
          className="mt-6 w-full" 
          onClick={addVehicle}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
        
        {vehicles.length > 2 && (
          <div className="mt-4 flex items-center p-3 border rounded text-amber-600 bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <p className="text-sm">
              This customer has {vehicles.length} vehicles. Consider adding them to a fleet if they manage multiple vehicles.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
