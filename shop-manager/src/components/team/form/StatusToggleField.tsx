
import { FormField, FormItem, FormLabel, FormDescription, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Control } from "react-hook-form";
import { TeamMemberFormValues } from "./formValidation";

interface StatusToggleFieldProps {
  control: Control<TeamMemberFormValues>;
}

export function StatusToggleField({ control }: StatusToggleFieldProps) {
  return (
    <FormField
      control={control}
      name="status"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">Active Status</FormLabel>
            <FormDescription>
              Inactive team members cannot log in or be assigned to work orders.
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
