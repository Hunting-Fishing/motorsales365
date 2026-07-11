import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssetUsage } from '@/hooks/inventory/useAssetUsage';
import { AssetUsageConfig } from '@/types/inventory/predictive';
import { useForm } from 'react-hook-form';
import { Gauge, TrendingUp } from 'lucide-react';

interface UpdateReadingDialogProps {
  open: boolean;
  onClose: () => void;
  asset: AssetUsageConfig | null;
}

interface FormData {
  current_reading: number;
  average_usage_per_day?: number;
}

export function UpdateReadingDialog({ open, onClose, asset }: UpdateReadingDialogProps) {
  const { updateReading, isUpdating } = useAssetUsage();
  const { register, handleSubmit, setValue, reset } = useForm<FormData>();

  useEffect(() => {
    if (asset) {
      setValue('current_reading', asset.current_reading);
      setValue('average_usage_per_day', asset.average_usage_per_day || undefined);
    }
  }, [asset, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!asset) return;

    try {
      await updateReading({
        id: asset.id,
        currentReading: Number(data.current_reading),
        averageUsagePerDay: data.average_usage_per_day ? Number(data.average_usage_per_day) : undefined
      });
      onClose();
      reset();
    } catch (error) {
      console.error('Error updating reading:', error);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Update Reading - {asset.asset_id}</DialogTitle>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Asset Type</p>
              <p className="font-medium capitalize">{asset.asset_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Usage Metric</p>
              <p className="font-medium">{asset.usage_metric.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Previous Reading</p>
              <p className="font-medium">{asset.current_reading.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">
                {asset.last_reading_date 
                  ? new Date(asset.last_reading_date).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_reading" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              New Reading
            </Label>
            <Input
              id="current_reading"
              type="number"
              step="0.01"
              min={asset.current_reading}
              placeholder={`Must be >= ${asset.current_reading}`}
              {...register('current_reading', { 
                required: true, 
                valueAsNumber: true,
                min: asset.current_reading 
              })}
            />
            <p className="text-sm text-muted-foreground">
              Enter the current {asset.usage_metric.replace('_', ' ')} reading
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="average_usage_per_day" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average Usage Per Day (Optional)
            </Label>
            <Input
              id="average_usage_per_day"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 8.5"
              {...register('average_usage_per_day', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Update the average daily usage for better predictions
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Reading'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
