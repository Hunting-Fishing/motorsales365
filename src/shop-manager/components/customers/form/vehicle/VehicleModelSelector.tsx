
import React from 'react';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Control, FieldPath, useController } from 'react-hook-form';

interface VehicleModelSelectorProps<T> {
  name: FieldPath<T>;
  label?: string;
  control: Control<T>;
  models: { model_name: string; model_make_id: string }[];
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function VehicleModelSelector<T>({
  name,
  label = 'Model',
  control,
  models,
  disabled = false,
  loading = false,
  required = false,
  placeholder = 'Select model'
}: VehicleModelSelectorProps<T>) {
  // Use the useController hook to properly handle form integration
  const { field } = useController({ name, control });

  // Safe check for missing values
  const safeValue = field.value as string || "";
  const safeModels = Array.isArray(models) ? models : [];

  return (
    <FormItem>
      <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
      <FormControl>
        <Select 
          disabled={disabled || loading} 
          value={safeValue} 
          onValueChange={field.onChange}
          name={name}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="loading-models" disabled>Loading models...</SelectItem>
            ) : safeModels.length > 0 ? (
              safeModels.map(model => {
                // Skip any empty values to avoid Radix UI error
                if (!model.model_name) return null;
                
                return (
                  <SelectItem key={model.model_name} value={model.model_name}>
                    {model.model_name || "Unknown Model"}
                  </SelectItem>
                );
              })
            ) : (
              <SelectItem value="no-models-available" disabled>No models available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
