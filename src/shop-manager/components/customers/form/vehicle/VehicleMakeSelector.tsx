
import React from 'react';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Control, FieldPath, useController } from 'react-hook-form';

interface VehicleMakeSelectorProps<T> {
  name: FieldPath<T>;
  label?: string;
  control: Control<T>;
  makes: { make_id: string; make_display: string }[];
  onMakeChange: (make: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function VehicleMakeSelector<T>({
  name,
  label = 'Make',
  control,
  makes,
  onMakeChange,
  disabled = false,
  required = false,
  placeholder = 'Select make'
}: VehicleMakeSelectorProps<T>) {
  // Use the useController hook to properly handle form integration
  const { field } = useController({ name, control });
  
  // Safe check for missing values
  const safeValue = field.value as string || "";
  const safeMakes = Array.isArray(makes) ? makes : [];
  
  return (
    <FormItem>
      <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
      <FormControl>
        <Select
          disabled={disabled}
          onValueChange={(value) => {
            field.onChange(value);
            onMakeChange(value);
          }}
          value={safeValue}
          name={name}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {safeMakes.length > 0 ? (
              safeMakes.map(make => {
                // Skip any empty or undefined values to avoid Radix UI error
                if (!make.make_id) return null;
                
                return (
                  <SelectItem key={make.make_id} value={make.make_id}>
                    {make.make_display || "Unknown Make"}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-makes-available" disabled>No makes available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
