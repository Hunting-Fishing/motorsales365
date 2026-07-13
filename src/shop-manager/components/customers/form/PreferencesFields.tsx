
import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerFormValues } from "./schemas/customerSchema";
import { useTechnicians } from "@/hooks/useTechnicians";

interface PreferencesFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const PreferencesFields: React.FC<PreferencesFieldsProps> = ({ form }) => {
  const { technicians, isLoading, error } = useTechnicians();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Service Preferences</h3>
        
        <FormField
          control={form.control}
          name="preferred_technician_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Technician</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue 
                      placeholder={
                        isLoading 
                          ? "Loading technicians..." 
                          : error 
                          ? "Error loading technicians"
                          : "Select a preferred technician"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {!isLoading && !error && technicians.map((technician) => (
                    <SelectItem key={technician.id} value={technician.id}>
                      {technician.name}
                      {technician.jobTitle && (
                        <span className="text-sm text-muted-foreground ml-2">
                          - {technician.jobTitle}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  {error && (
                    <SelectItem value="none" disabled>
                      Failed to load technicians
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="communication_preference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Communication Preference</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select communication preference" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="any">Any Method</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
