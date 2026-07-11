import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EquipmentTypeFieldProps {
  form: UseFormReturn<any>;
  index: number;
}

export const EQUIPMENT_TYPES = [
  { value: 'vehicle', label: 'Vehicle (Car/Truck/SUV)' },
  { value: 'generator', label: 'Generator' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'semi_truck', label: 'Semi Truck' },
  { value: 'small_engine', label: 'Small Engine' },
  { value: 'outboard_motor', label: 'Outboard Motor' },
  { value: 'marine_equipment', label: 'Marine Equipment' },
  { value: 'heavy_equipment', label: 'Heavy Equipment' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'rv', label: 'RV/Motorhome' },
  { value: 'atv_utv', label: 'ATV/UTV' },
  { value: 'other', label: 'Other' },
];

export const EquipmentTypeField: React.FC<EquipmentTypeFieldProps> = ({
  form,
  index,
}) => {
  return (
    <FormField
      control={form.control}
      name={`vehicles.${index}.equipment_type`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Equipment Type</FormLabel>
          <Select 
            onValueChange={field.onChange} 
            value={field.value || 'vehicle'}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {EQUIPMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
