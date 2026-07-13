
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
import { ReminderFormValues } from "../schemas/reminderFormSchema";

interface ReminderTypeFieldProps {
  form: UseFormReturn<ReminderFormValues>;
}

export function ReminderTypeField({ form }: ReminderTypeFieldProps) {
  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Reminder Type</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select reminder type" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="follow_up">Follow-Up</SelectItem>
              <SelectItem value="warranty">Warranty</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
