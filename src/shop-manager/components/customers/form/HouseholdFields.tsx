import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerFormValues } from './schemas/customerSchema';

interface HouseholdFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

const relationshipTypes = [
  { id: "primary", label: "Primary" },
  { id: "spouse", label: "Spouse" },
  { id: "child", label: "Child" },
  { id: "parent", label: "Parent" },
  { id: "sibling", label: "Sibling" },
  { id: "other", label: "Other" }
];

export const HouseholdFields: React.FC<HouseholdFieldsProps> = ({ form }) => {
  const createNewHousehold = form.watch("create_new_household");
  const householdId = form.watch("household_id");

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="create_new_household"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Create New Household</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {createNewHousehold && (
        <FormField
          control={form.control}
          name="new_household_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Household Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter household name"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {!createNewHousehold && (
        <FormField
          control={form.control}
          name="household_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Household</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing household" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No household</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {(createNewHousehold || householdId) && (
        <FormField
          control={form.control}
          name="household_relationship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {relationshipTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
