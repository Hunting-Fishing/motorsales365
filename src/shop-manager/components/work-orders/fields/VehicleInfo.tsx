
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface VehicleInfoProps {
  form: any;
}

export const VehicleInfo: React.FC<VehicleInfoProps> = ({ form }) => {
  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardContent className="pt-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Vehicle Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vehicle Year */}
          <FormField
            control={form.control}
            name="vehicleYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Year" 
                    className="bg-white dark:bg-slate-800" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Vehicle Make */}
          <FormField
            control={form.control}
            name="vehicleMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Make" 
                    className="bg-white dark:bg-slate-800" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Vehicle Model */}
          <FormField
            control={form.control}
            name="vehicleModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Model" 
                    className="bg-white dark:bg-slate-800" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* License Plate Field (optional) */}
          <FormField
            control={form.control}
            name="licensePlate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>License Plate</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="License plate" 
                    className="bg-white dark:bg-slate-800" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* VIN Field (optional) */}
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VIN</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Vehicle identification number" 
                    className="bg-white dark:bg-slate-800" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
