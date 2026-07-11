
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface BasicVehicleFieldsProps {
  form: any;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleId?: string;
  isFleetCustomer?: boolean;
}

export const BasicVehicleFields: React.FC<BasicVehicleFieldsProps> = ({ 
  form, 
  vehicleMake = '', 
  vehicleModel = '', 
  vehicleYear = '',
  vehicleId = '',
  isFleetCustomer = false
}) => {
  return (
    <>
      {/* Only display Vehicle ID field for fleet/business customers */}
      {isFleetCustomer && (
        <FormField
          control={form.control}
          name="vehicleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fleet Vehicle ID</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value || vehicleId}
                  placeholder="Fleet/Business Vehicle ID"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {/* Always hidden field to store vehicle ID for database reference */}
      {!isFleetCustomer && vehicleId && (
        <input type="hidden" name="vehicleId" value={vehicleId} />
      )}

      <FormField
        control={form.control}
        name="vehicleMake"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Make</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                value={field.value || vehicleMake}
                placeholder="Vehicle make" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="vehicleModel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Model</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                value={field.value || vehicleModel}
                placeholder="Vehicle model" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="vehicleYear"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Year</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                value={field.value || vehicleYear}
                placeholder="Vehicle year" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="odometer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Odometer</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="Current odometer reading" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="licensePlate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>License Plate</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="License plate number" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
