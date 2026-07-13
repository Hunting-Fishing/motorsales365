
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ReminderFormValues } from "../schemas/reminderFormSchema";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface RecurrenceFieldsProps {
  form: UseFormReturn<ReminderFormValues>;
}

export function RecurrenceFields({ form }: RecurrenceFieldsProps) {
  const isRecurring = form.watch("isRecurring");
  
  // Set default values when toggling recurrence
  const handleRecurrenceToggle = (checked: boolean) => {
    form.setValue("isRecurring", checked);
    
    if (checked && !form.getValues("recurrenceInterval")) {
      form.setValue("recurrenceInterval", 1);
    }
    
    if (checked && !form.getValues("recurrenceUnit")) {
      form.setValue("recurrenceUnit", "months");
    }
  };
  
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="isRecurring"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Recurring Reminder</FormLabel>
              <FormDescription>
                Set this reminder to repeat automatically
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={handleRecurrenceToggle}
              />
            </FormControl>
          </FormItem>
        )}
      />
      
      {isRecurring && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
          <FormField
            control={form.control}
            name="recurrenceInterval"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repeat every</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="1"
                    {...field}
                    onChange={(e) => {
                      // Parse as number and ensure it's positive
                      const value = parseInt(e.target.value, 10);
                      field.onChange(value > 0 ? value : 1);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="recurrenceUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
