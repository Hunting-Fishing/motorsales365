
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { VinDecodeResult } from "@/types/vehicle";

interface VehicleAdditionalDetailsProps {
  form: UseFormReturn<any>;
  index: number;
  decodedDetails?: VinDecodeResult | null;
}

export const VehicleAdditionalDetails: React.FC<VehicleAdditionalDetailsProps> = ({
  form,
  index,
  decodedDetails
}) => {
  // Check if we have any decoded details to show
  const hasDecodedData = decodedDetails && Object.values(decodedDetails).some(value => value !== null && value !== '');

  const transmissionOptions = [
    'Automatic',
    'Manual',
    'CVT',
    'Semi-Automatic',
    'Dual Clutch',
    'Other'
  ];

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

  const driveTypeOptions = [
    'FWD',
    'RWD', 
    'AWD',
    '4WD',
    '4x4',
    'Part-time 4WD',
    'Other'
  ];

  const bodyStyleOptions = [
    'Sedan',
    'Hatchback',
    'Coupe',
    'Convertible',
    'Wagon',
    'SUV',
    'Crossover',
    'Minivan',
    'Van',
    'Pickup',
    'Truck',
    'Bus',
    'Motorcycle',
    'Off-road',
    'Other'
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Additional Vehicle Details</CardTitle>
          {hasDecodedData && (
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Zap className="h-3 w-3 mr-1" />
              VIN Decoded
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Color */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.color`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Vehicle color"
                  className={decodedDetails?.color ? "bg-green-50 border-green-200" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Trim Level */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.trim`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trim Level</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Trim level"
                  className={decodedDetails?.trim ? "bg-green-50 border-green-200" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Transmission */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.transmission`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transmission</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger className={decodedDetails?.transmission ? "bg-green-50 border-green-200" : ""}>
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {transmissionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fuel Type */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.fuel_type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fuel Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger className={decodedDetails?.fuel_type ? "bg-green-50 border-green-200" : ""}>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fuelTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Drive Type */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.drive_type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Drive Type</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger className={decodedDetails?.drive_type ? "bg-green-50 border-green-200" : ""}>
                    <SelectValue placeholder="Select drive type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {driveTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Body Style */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.body_style`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body Style</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger className={decodedDetails?.body_style ? "bg-green-50 border-green-200" : ""}>
                    <SelectValue placeholder="Select body style" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {bodyStyleOptions.map((option) => (
                    <SelectItem key={option} value={option.toLowerCase()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Engine */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.engine`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Engine</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Engine details"
                  className={decodedDetails?.engine ? "bg-green-50 border-green-200" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Country of Origin */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.country`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country of Origin</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Country of origin"
                  className={decodedDetails?.country ? "bg-green-50 border-green-200" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* GVWR */}
        <FormField
          control={form.control}
          name={`vehicles.${index}.gvwr`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>GVWR</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Gross Vehicle Weight Rating"
                  className={decodedDetails?.gvwr ? "bg-green-50 border-green-200" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
