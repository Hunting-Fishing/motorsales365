
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { VinDecodeResult } from "@/types/vehicle";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { VehicleBodyStyle } from "@/types/vehicleBodyStyles";

interface DecodedVehicleFieldsProps {
  form: any;
  decodedVehicle: VinDecodeResult | null;
}

export const DecodedVehicleFields: React.FC<DecodedVehicleFieldsProps> = ({ 
  form, 
  decodedVehicle 
}) => {
  // If no decoded vehicle data, don't render anything
  if (!decodedVehicle) return null;

  // Define body style options
  const bodyStyleOptions: { label: string; value: VehicleBodyStyle }[] = [
    { label: 'Sedan', value: 'sedan' },
    { label: 'Hatchback', value: 'hatchback' },
    { label: 'Coupe', value: 'coupe' },
    { label: 'Convertible', value: 'convertible' },
    { label: 'Wagon', value: 'wagon' },
    { label: 'SUV', value: 'suv' },
    { label: 'Crossover', value: 'crossover' },
    { label: 'Minivan', value: 'minivan' },
    { label: 'Van', value: 'van' },
    { label: 'Pickup', value: 'pickup' },
    { label: 'Truck', value: 'truck' },
    { label: 'Bus', value: 'bus' },
    { label: 'Motorcycle', value: 'motorcycle' },
    { label: 'Off-road', value: 'off-road' },
    { label: 'Other', value: 'other' },
  ];
  
  // Common fuel types
  const fuelTypeOptions = [
    'Gasoline',
    'Diesel',
    'Electric',
    'Hybrid',
    'Plug-in Hybrid',
    'Flex-Fuel',
    'CNG',
    'LPG',
    'Hydrogen',
    'Other'
  ];
  
  // Common transmission types
  const transmissionOptions = [
    'Automatic',
    'Manual',
    'CVT',
    'Semi-Automatic',
    'Dual Clutch',
    'Other'
  ];
  
  // Common drive types
  const driveTypeOptions = [
    'FWD',
    'RWD',
    'AWD',
    '4WD',
    '4x4',
    'Part-time 4WD',
    'Other'
  ];

  // Create an array of fields to conditionally render
  const decodedFields = [
    {
      name: "transmission",
      label: "Transmission",
      value: decodedVehicle.transmission,
      placeholder: "Transmission",
      type: "select",
      options: transmissionOptions
    },
    {
      name: "driveType",
      label: "Drive Type",
      value: decodedVehicle.drive_type,
      placeholder: "Drive Type",
      type: "select",
      options: driveTypeOptions
    },
    {
      name: "fuelType",
      label: "Fuel Type",
      value: decodedVehicle.fuel_type,
      placeholder: "Fuel Type",
      type: "select",
      options: fuelTypeOptions
    },
    {
      name: "engine",
      label: "Engine",
      value: decodedVehicle.engine,
      placeholder: "Engine",
      type: "text"
    },
    {
      name: "bodyStyle",
      label: "Body Style",
      value: decodedVehicle.body_style,
      placeholder: "Body Style",
      type: "select",
      options: bodyStyleOptions
    },
    {
      name: "country",
      label: "Country of Origin",
      value: decodedVehicle.country,
      placeholder: "Country of Origin",
      type: "text"
    }
  ];

  // Check if any of the fields have values
  const hasAdditionalInfo = decodedFields.some(field => field.value);

  if (!hasAdditionalInfo) return null;

  return (
    <div className="col-span-full mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Additional Vehicle Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {decodedFields.map(field => {
            // Only render fields that have values
            if (!field.value) return null;
            
            if (field.type === "select") {
              return (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>{field.label}</FormLabel>
                      <Select 
                        onValueChange={formField.onChange} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {field.options?.map((option: any) => {
                            const value = typeof option === 'object' ? option.value : option;
                            const label = typeof option === 'object' ? option.label : option;
                            return (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              );
            }
            
            return (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>
                      <Input 
                        {...formField} 
                        defaultValue={field.value}
                        placeholder={field.placeholder}
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
