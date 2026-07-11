import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WorkOrderPartFormValues, PART_TYPES, WORK_ORDER_PART_STATUSES } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { createWorkOrderPart } from '@/services/workOrder/workOrderPartsService';
import { PartTypeAndStatusFields } from './PartTypeAndStatusFields';
import { AdvancedPartFields } from './AdvancedPartFields';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const addPartSchema = z.object({
  name: z.string().min(1, 'Part name is required'),
  part_number: z.string().min(1, 'Part number is required'),
  part_type: z.enum(['inventory', 'non-inventory']),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1').default(1),
  unit_price: z.number().min(0, 'Price cannot be negative').default(0),
  status: z.string().optional().default('pending'),
  notes: z.string().optional(),
  job_line_id: z.string().optional(),
  category: z.string().optional(),
  supplierName: z.string().optional(),
  supplierCost: z.number().optional(),
  supplierSuggestedRetail: z.number().optional(),
  markupPercentage: z.number().optional(),
  isTaxable: z.boolean().optional(),
  coreChargeAmount: z.number().optional(),
  coreChargeApplied: z.boolean().optional(),
  warrantyDuration: z.string().optional(),
  invoiceNumber: z.string().optional(),
  isStockItem: z.boolean().optional(),
});

interface EnhancedAddPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  onPartAdded: () => Promise<void>;
}

export function EnhancedAddPartDialog({
  open,
  onOpenChange,
  workOrderId,
  jobLines,
  onPartAdded
}: EnhancedAddPartDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(addPartSchema),
    defaultValues: {
      name: '',
      part_number: '',
      part_type: 'inventory',
      description: '',
      quantity: 1,
      unit_price: 0,
      status: 'pending',
      notes: '',
      job_line_id: '',
      category: '',
      supplierName: '',
      supplierCost: 0,
      supplierSuggestedRetail: 0,
      markupPercentage: 0,
      isTaxable: false,
      coreChargeAmount: 0,
      coreChargeApplied: false,
      warrantyDuration: '',
      invoiceNumber: '',
      isStockItem: false,
    },
  });

  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      console.log('Submitting enhanced part form:', values);

      // Create the part with work order ID
      const partData = {
        ...values,
        work_order_id: workOrderId,
        job_line_id: values.job_line_id === 'none' ? null : values.job_line_id
      };

      // Fix: Call createWorkOrderPart with single argument
      await createWorkOrderPart(partData);
      
      console.log('Part created successfully via enhanced dialog');
      toast.success('Part added successfully');
      
      // Close dialog and refresh data
      onOpenChange(false);
      form.reset();
      
      // Notify parent to refresh data
      if (onPartAdded) {
        await onPartAdded();
      }
    } catch (error) {
      console.error('Error creating part via enhanced dialog:', error);
      toast.error('Failed to add part');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!isSubmitting) {
      if (!open) {
        form.reset();
        setSubmitError(null);
      }
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Part</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {submitError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter part name..." />
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
                    <FormLabel>Part Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter part number..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quantity and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        placeholder="Enter quantity..."
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
                    <FormLabel>Unit Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Part Type and Status */}
            <PartTypeAndStatusFields form={form as any} />

            {/* Advanced Fields */}
            <AdvancedPartFields form={form as any} />

            {/* Description and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter part description..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter any additional notes..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Job Line Assignment */}
            {jobLines.length > 0 && (
              <FormField
                control={form.control}
                name="job_line_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Job Line</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job line..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Assignment</SelectItem>
                          {jobLines.map((jobLine) => (
                            <SelectItem key={jobLine.id} value={jobLine.id}>
                              {jobLine.name} - {jobLine.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Part...
                  </>
                ) : (
                  'Add Part'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
