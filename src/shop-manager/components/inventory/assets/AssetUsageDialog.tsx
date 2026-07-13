import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssetUsage } from '@/hooks/inventory/useAssetUsage';
import { AssetUsageConfig, USAGE_METRICS } from '@/types/inventory/predictive';
import { useForm } from 'react-hook-form';

interface AssetUsageDialogProps {
  open: boolean;
  onClose: () => void;
  asset?: AssetUsageConfig | null;
}

interface FormData {
  asset_id: string;
  asset_type: string;
  usage_metric: string;
  current_reading: number;
  average_usage_per_day?: number;
}

export function AssetUsageDialog({ open, onClose, asset }: AssetUsageDialogProps) {
  const { saveAsset, isSaving } = useAssetUsage();
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>({
    defaultValues: {
      asset_id: '',
      asset_type: 'vehicle',
      usage_metric: 'engine_hours',
      current_reading: 0,
      average_usage_per_day: undefined
    }
  });

  const assetType = watch('asset_type');
  const usageMetric = watch('usage_metric');

  useEffect(() => {
    if (asset) {
      setValue('asset_id', asset.asset_id);
      setValue('asset_type', asset.asset_type);
      setValue('usage_metric', asset.usage_metric);
      setValue('current_reading', asset.current_reading);
      setValue('average_usage_per_day', asset.average_usage_per_day || undefined);
    } else {
      reset();
    }
  }, [asset, setValue, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await saveAsset({
        asset_id: data.asset_id,
        asset_type: data.asset_type as any,
        usage_metric: data.usage_metric as any,
        current_reading: Number(data.current_reading),
        average_usage_per_day: data.average_usage_per_day ? Number(data.average_usage_per_day) : undefined,
        last_reading_date: new Date().toISOString()
      });
      onClose();
      reset();
    } catch (error) {
      console.error('Error saving asset:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset_id">Asset ID / Name</Label>
            <Input
              id="asset_id"
              placeholder="e.g., Truck-001, Excavator-A"
              {...register('asset_id', { required: true })}
            />
            <p className="text-sm text-muted-foreground">
              Unique identifier for this asset (VIN, serial number, or custom ID)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_type">Asset Type</Label>
            <Select
              value={assetType}
              onValueChange={(value) => setValue('asset_type', value)}
            >
              <SelectTrigger id="asset_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="machinery">Machinery</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage_metric">Usage Metric</Label>
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
              How usage will be measured for this asset
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_reading">Current Reading</Label>
            <Input
              id="current_reading"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 12500"
              {...register('current_reading', { required: true, valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Current {usageMetric.replace('_', ' ')} reading
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="average_usage_per_day">Average Usage Per Day (Optional)</Label>
            <Input
              id="average_usage_per_day"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 8.5"
              {...register('average_usage_per_day', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Helps predict when service is due
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : asset ? 'Update Asset' : 'Add Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
