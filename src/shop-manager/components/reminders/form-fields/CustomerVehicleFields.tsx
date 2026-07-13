
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ReminderFormValues } from "../schemas/reminderFormSchema";

interface CustomerVehicleFieldsProps {
  form: UseFormReturn<ReminderFormValues>;
  customerId?: string;
  vehicleId?: string;
}

export function CustomerVehicleFields({ form, customerId, vehicleId }: CustomerVehicleFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="customerId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer</FormLabel>
            <FormControl>
              <Input {...field} disabled={!!customerId} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="vehicleId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vehicle (Optional)</FormLabel>
            <FormControl>
              <Input {...field} disabled={!!vehicleId} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
