
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import { WorkOrderPartFormValues } from '@/types/workOrderPart';

interface BasicPartFieldsProps {
  form: UseFormReturn<WorkOrderPartFormValues>;
}

export function BasicPartFields({ form }: BasicPartFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Part Name <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter part name..." 
                {...field}
                onChange={(e) => field.onChange(e.target.value.trim())}
                className={!field.value || field.value.trim() === '' ? 'border-red-300' : ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="part_number"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Part Number <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input 
                placeholder="Enter part number..." 
                {...field}
                onChange={(e) => field.onChange(e.target.value.trim())}
                className={!field.value || field.value.trim() === '' ? 'border-red-300' : ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                min="1"
                placeholder="1"
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="unit_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Unit Price</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                min="0"
                step="0.01"
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="md:col-span-2">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter part description..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="md:col-span-2">
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes..."
                  className="resize-none"  
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
