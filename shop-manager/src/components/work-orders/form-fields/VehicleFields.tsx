
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";
import { Car, Calendar, Hash, CreditCard, Wrench } from "lucide-react";

interface VehicleFieldsProps {
  form: UseFormReturn<WorkOrderFormSchemaValues>;
}

export const VehicleFields: React.FC<VehicleFieldsProps> = ({ form }) => {
  return (
    <Card className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/30 border-emerald-200/60 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg">
            <Car className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Vehicle Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="vehicleMake"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-800 font-medium flex items-center gap-2">
                  <Car className="h-4 w-4 text-emerald-600" />
                  Make
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Toyota, Ford, BMW" 
                    className="h-11 bg-white/80 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    {...field} 
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
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-800 font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  Model
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Camry, F-150, X3" 
                    className="h-11 bg-white/80 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    {...field} 
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
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-800 font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  Year
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 2020, 2018" 
                    className="h-11 bg-white/80 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    {...field} 
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
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-800 font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-600" />
                  Odometer
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 45,000 miles" 
                    className="h-11 bg-white/80 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    {...field} 
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
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-800 font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  License Plate
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., ABC-1234" 
                    className="h-11 bg-white/80 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-slate-800 font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4 text-emerald-600" />
                  VIN
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="17-character VIN number" 
                    className="h-11 bg-white/80 border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Card>
  );
};
