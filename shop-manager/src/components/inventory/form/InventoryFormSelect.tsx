
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export interface SelectOption {
  value: string;
  label: string;
}

interface InventoryFormSelectProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[] | SelectOption[];
  error?: string;
  required?: boolean;
}

export function InventoryFormSelect({
  id,
  label,
  value,
  onValueChange,
  options,
  error,
  required = false,
}: InventoryFormSelectProps) {
  // Format options to ensure they are all SelectOption objects
  const formattedOptions = options.map((option) => {
    if (typeof option === "string") {
      return { value: option, label: option };
    }
    return option;
  });

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          {formattedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
