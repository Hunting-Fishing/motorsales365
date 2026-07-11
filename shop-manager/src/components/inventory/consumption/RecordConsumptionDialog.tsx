import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConsumptionTracking } from '@/hooks/inventory/useConsumptionTracking';
import { useInventoryData } from '@/hooks/inventory/useInventoryData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { USAGE_METRICS } from '@/types/inventory/predictive';
import { useForm } from 'react-hook-form';

interface RecordConsumptionDialogProps {
  open: boolean;
  onClose: () => void;
}

interface FormData {
  inventory_item_id: string;
  quantity_consumed: number;
  usage_metric: string;
  usage_value: number;
  service_package_id?: string;
  notes?: string;
}

export function RecordConsumptionDialog({ open, onClose }: RecordConsumptionDialogProps) {
  const { recordConsumption, isRecording } = useConsumptionTracking();
  const { items: inventoryItems } = useInventoryData();
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      usage_metric: 'engine_hours',
      quantity_consumed: 1
    }
  });

  const selectedItemId = watch('inventory_item_id');
  const usageMetric = watch('usage_metric');

  // Fetch service packages
  const { data: servicePackages = [] } = useQuery({
    queryKey: ['service-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_packages')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const selectedItem = inventoryItems.find(item => item.id === selectedItemId);

  const onSubmit = async (data: FormData) => {
    try {
      await recordConsumption({
        inventory_item_id: data.inventory_item_id,
        quantity_consumed: Number(data.quantity_consumed),
        usage_metric: data.usage_metric,
        usage_value: Number(data.usage_value),
        service_package_id: data.service_package_id || undefined,
        notes: data.notes
      });
      onClose();
      reset();
    } catch (error) {
      console.error('Error recording consumption:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Record Parts Consumption</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inventory_item_id">Inventory Item *</Label>
            <Select
              value={selectedItemId}
              onValueChange={(value) => setValue('inventory_item_id', value)}
            >
              <SelectTrigger id="inventory_item_id">
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} - {item.sku} (Stock: {item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                Current stock: {selectedItem.quantity} units
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_consumed">Quantity Consumed *</Label>
              <Input
                id="quantity_consumed"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g., 2"
                {...register('quantity_consumed', { required: true, valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_value">Usage Value *</Label>
              <Input
                id="usage_value"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g., 250"
                {...register('usage_value', { required: true, valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage_metric">Usage Metric *</Label>
            <Select
              value={usageMetric}
              onValueChange={(value) => setValue('usage_metric', value)}
            >
              <SelectTrigger id="usage_metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USAGE_METRICS.map((metric) => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Example: 2 filters consumed every 250 engine hours
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_package_id">Service Package (Optional)</Label>
            <Select
              value={watch('service_package_id')}
              onValueChange={(value) => setValue('service_package_id', value)}
            >
              <SelectTrigger id="service_package_id">
                <SelectValue placeholder="None - manual consumption" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {servicePackages.map((pkg: any) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about this consumption..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">What will happen:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Inventory will be reduced by the consumed quantity</li>
              <li>Consumption rate will be calculated/updated automatically</li>
              <li>Data will be used for predictive forecasting</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isRecording}>
              {isRecording ? 'Recording...' : 'Record Consumption'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
