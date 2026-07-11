
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { CustomerFormValues } from './schemas/customerSchema';
import { TagSelector } from './tag/TagSelector';

interface SegmentFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const SegmentFields: React.FC<SegmentFieldsProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="segments"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Segments</FormLabel>
            <FormControl>
              <TagSelector
                selectedTags={field.value || []}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
