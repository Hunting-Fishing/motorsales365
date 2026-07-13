
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { useSuppliers } from '@/hooks/inventory/useSuppliers';
import { WorkOrderPartFormValues } from '@/types/workOrderPart';

interface SupplierSelectorProps {
  form: UseFormReturn<WorkOrderPartFormValues>;
}

export function SupplierSelector({ form }: SupplierSelectorProps) {
  const { suppliers, loading, error } = useSuppliers();

  if (loading) {
    return (
      <FormField
        control={form.control}
        name="supplierName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Supplier</FormLabel>
            <FormControl>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Loading suppliers..." />
                </SelectTrigger>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (error) {
    return (
      <FormField
        control={form.control}
        name="supplierName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Supplier</FormLabel>
            <FormControl>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Error loading suppliers" />
                </SelectTrigger>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name="supplierName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Supplier</FormLabel>
          <FormControl>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
