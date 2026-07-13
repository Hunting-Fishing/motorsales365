
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { WorkOrderPartFormValues, PART_TYPES, WORK_ORDER_PART_STATUSES, partStatusMap } from '@/types/workOrderPart';
import { Badge } from '@/components/ui/badge';

interface PartTypeAndStatusFieldsProps {
  form: UseFormReturn<WorkOrderPartFormValues>;
}

export function PartTypeAndStatusFields({ form }: PartTypeAndStatusFieldsProps) {
  // Filter out any invalid statuses
  const validStatuses = WORK_ORDER_PART_STATUSES.filter(status => 
    status && 
    typeof status === 'string' && 
    status.trim() !== ''
  );

  const validPartTypes = PART_TYPES.filter(type => 
    type && 
    typeof type === 'string' && 
    type.trim() !== ''
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="part_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Part Type *</FormLabel>
            <FormControl>
              <Select 
                onValueChange={(value) => {
                  if (value && value.trim() !== '') {
                    field.onChange(value);
                  }
                }} 
                value={field.value || ''}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select part type..." />
                </SelectTrigger>
                <SelectContent>
                  {validPartTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center space-x-2">
                        <span className="capitalize">{type.replace('-', ' ')}</span>
                        {type === 'inventory' && (
                          <Badge variant="outline" className="text-xs">
                            Tracked
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <FormControl>
              <Select 
                onValueChange={(value) => {
                  if (value && value.trim() !== '') {
                    field.onChange(value);
                  }
                }} 
                value={field.value || 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {validStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={partStatusMap[status]?.classes || 'bg-gray-100 text-gray-800'}
                        >
                          {partStatusMap[status]?.label || status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
