import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkOrders } from '@/hooks/inventory/useWorkOrders';
import { useForm } from 'react-hook-form';

interface CreateWorkOrderDialogProps {
  open: boolean;
  onClose: () => void;
}

interface FormData {
  asset_id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date?: string;
  assigned_to?: string;
}

export function CreateWorkOrderDialog({ open, onClose }: CreateWorkOrderDialogProps) {
  const { createWorkOrder } = useWorkOrders();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormData>({
    defaultValues: {
      priority: 'medium'
    }
  });

  const priority = watch('priority');

  const onSubmit = async (data: FormData) => {
    try {
      await createWorkOrder(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error creating work order:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Work Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset_id">Asset ID *</Label>
            <Input
              id="asset_id"
              placeholder="Enter asset identifier"
              {...register('asset_id', { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., 10,000 mile service"
              {...register('title', { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Work order details"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={priority} 
              onValueChange={(value) => setValue('priority', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled_date">Scheduled Date</Label>
            <Input
              id="scheduled_date"
              type="date"
              {...register('scheduled_date')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Input
              id="assigned_to"
              placeholder="Technician name"
              {...register('assigned_to')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Work Order
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
