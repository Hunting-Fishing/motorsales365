
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { WorkOrderPartFormValues, WORK_ORDER_PART_STATUSES, PART_TYPES } from '@/types/workOrderPart';
import { WorkOrderJobLine } from '@/types/jobLine';
import { createWorkOrderPart } from '@/services/workOrder/workOrderPartsService';
import { BasicPartFields } from './BasicPartFields';
import { PartTypeAndStatusFields } from './PartTypeAndStatusFields';
import { JobLineSelector } from './JobLineSelector';
import { toast } from 'sonner';

interface AddPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  onPartAdded: () => void;
}

// Create Zod schema that matches WorkOrderPartFormValues interface
const addPartSchema = z.object({
  name: z.string().min(1, "Part name is required"),
  part_number: z.string().min(1, "Part number is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Unit price must be non-negative"),
  total_price: z.number().optional(),
  status: z.string(), // Use string instead of enum to match interface
  notes: z.string().optional(),
  job_line_id: z.string().optional(),
  category: z.string().optional(),
  part_type: z.string(), // Use string instead of enum to match interface
  customerPrice: z.number().optional(),
  supplierCost: z.number().optional(),
  supplierSuggestedRetail: z.number().optional(),
  markupPercentage: z.number().optional(),
  isTaxable: z.boolean().optional(),
  coreChargeAmount: z.number().optional(),
  coreChargeApplied: z.boolean().optional(),
  warrantyDuration: z.string().optional(),
  warrantyExpiryDate: z.string().optional(),
  installDate: z.string().optional(),
  installedBy: z.string().optional(),
  invoiceNumber: z.string().optional(),
  poLine: z.string().optional(),
  isStockItem: z.boolean().optional(),
  supplierName: z.string().optional(),
  supplierOrderRef: z.string().optional(),
  notesInternal: z.string().optional(),
  inventoryItemId: z.string().optional(),
  estimatedArrivalDate: z.string().optional(),
  itemStatus: z.string().optional(),
});

export function AddPartDialog({
  open,
  onOpenChange,
  workOrderId,
  jobLines,
  onPartAdded
}: AddPartDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(addPartSchema),
    defaultValues: {
      name: '',
      part_number: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      status: 'pending',
      notes: '',
      job_line_id: '',
      category: '',
      part_type: 'inventory',
      customerPrice: 0,
      supplierCost: 0,
      supplierSuggestedRetail: 0,
      markupPercentage: 0,
      isTaxable: false,
      coreChargeAmount: 0,
      coreChargeApplied: false,
      warrantyDuration: '',
      warrantyExpiryDate: '',
      installDate: '',
      installedBy: '',
      invoiceNumber: '',
      poLine: '',
      isStockItem: false,
      supplierName: '',
      supplierOrderRef: '',
      notesInternal: '',
      inventoryItemId: '',
      estimatedArrivalDate: '',
      itemStatus: '',
    }
  });

  // Watch quantity and unit_price to auto-calculate total_price
  const quantity = form.watch('quantity');
  const unitPrice = form.watch('unit_price');

  useEffect(() => {
    if (quantity && unitPrice) {
      const total = quantity * unitPrice;
      form.setValue('total_price', total);
    }
  }, [quantity, unitPrice, form]);

  const handleSubmit = async (data: any) => {
    if (!workOrderId) {
      toast.error('Work Order ID is required');
      return;
    }

    // Client-side validation for required fields
    if (!data.name || data.name.trim() === '') {
      toast.error('Part name is required');
      form.setError('name', { message: 'Part name is required' });
      return;
    }

    if (!data.part_number || data.part_number.trim() === '') {
      toast.error('Part number is required');
      form.setError('part_number', { message: 'Part number is required' });
      return;
    }

    if (!data.quantity || data.quantity < 1) {
      toast.error('Quantity must be at least 1');
      form.setError('quantity', { message: 'Quantity must be at least 1' });
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Creating part with validated data:', data);

      const partData = {
        ...data,
        work_order_id: workOrderId,
        name: data.name.trim(),
        part_number: data.part_number.trim(),
        quantity: Math.max(1, Number(data.quantity)),
        unit_price: Math.max(0, Number(data.unit_price)),
        total_price: data.total_price || (Math.max(1, Number(data.quantity)) * Math.max(0, Number(data.unit_price)))
      };

      await createWorkOrderPart(partData);
      
      toast.success('Part added successfully');
      form.reset();
      onPartAdded();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error creating part:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add part';
      toast.error(`Failed to add part: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Part to Work Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <BasicPartFields form={form as any} />
            
            <PartTypeAndStatusFields form={form as any} />
            
            <JobLineSelector 
              form={form as any} 
              jobLines={jobLines}
              workOrderId={workOrderId}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Part'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
