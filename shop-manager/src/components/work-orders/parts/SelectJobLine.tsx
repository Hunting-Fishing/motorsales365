
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { WorkOrderJobLine } from '@/types/jobLine';

interface SelectJobLineProps {
  form: UseFormReturn<any>;
  jobLines: WorkOrderJobLine[];
  workOrderId: string;
}

export function SelectJobLine({ form, jobLines, workOrderId }: SelectJobLineProps) {
  // Filter valid job lines for this work order
  const validJobLines = jobLines.filter(jobLine => 
    jobLine && 
    jobLine.id && 
    jobLine.name &&
    jobLine.work_order_id === workOrderId
  );

  return (
    <FormField
      control={form.control}
      name="job_line_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Job Line (Optional)</FormLabel>
          <FormControl>
            <Select 
              onValueChange={(value) => {
                // Allow empty value for unassigned parts
                field.onChange(value === 'unassigned' ? '' : value);
              }} 
              value={field.value || 'unassigned'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select job line or leave unassigned..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-gray-500">Unassigned</span>
                </SelectItem>
                {validJobLines.map((jobLine) => (
                  <SelectItem key={jobLine.id} value={jobLine.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{jobLine.name}</span>
                      {jobLine.description && (
                        <span className="text-sm text-gray-500">{jobLine.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
          {validJobLines.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              No job lines available. Part will be unassigned.
            </p>
          )}
        </FormItem>
      )}
    />
  );
}
