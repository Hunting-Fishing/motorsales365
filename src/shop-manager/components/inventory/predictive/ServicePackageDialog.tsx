import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServicePackage, USAGE_METRICS, UNIT_OPTIONS } from '@/types/inventory/predictive';
import {
  createServicePackage,
  updateServicePackage,
  addItemToServicePackage,
  removeItemFromServicePackage,
} from '@/services/inventory/predictiveService';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface ServicePackageDialogProps {
  open: boolean;
  onClose: (success?: boolean) => void;
  packageData?: ServicePackage;
}

export function ServicePackageDialog({ open, onClose, packageData }: ServicePackageDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('maintenance');
  const [intervalValue, setIntervalValue] = useState<number>(250);
  const [intervalMetric, setIntervalMetric] = useState<string>('engine_hours');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isActive, setIsActive] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (packageData) {
      setName(packageData.name);
      setDescription(packageData.description || '');
      setCategory(packageData.category || 'maintenance');
      setIntervalValue(packageData.interval_value);
      setIntervalMetric(packageData.interval_metric);
      setDurationMinutes(packageData.estimated_duration_minutes || 60);
      setIsActive(packageData.is_active);
      setItems(packageData.items || []);
    } else {
      resetForm();
    }
  }, [packageData, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('maintenance');
    setIntervalValue(250);
    setIntervalMetric('engine_hours');
    setDurationMinutes(60);
    setIsActive(true);
    setItems([]);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        part_name: '',
        part_number: '',
        quantity: 1,
        unit: 'each',
        is_optional: false,
        notes: '',
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!name || !intervalValue) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in required fields',
      });
      return;
    }

    setLoading(true);
    try {
      const packagePayload = {
        name,
        description,
        category: category as any,
        interval_value: intervalValue,
        interval_metric: intervalMetric as any,
        estimated_duration_minutes: durationMinutes,
        is_active: isActive,
      };

      let packageId: string;

      if (packageData) {
        await updateServicePackage(packageData.id, packagePayload);
        packageId = packageData.id;
      } else {
        const newPackage = await createServicePackage(packagePayload);
        packageId = newPackage.id;
      }

      // Add new items
      for (const item of items) {
        if (!item.id) {
          await addItemToServicePackage({
            service_package_id: packageId,
            ...item,
          });
        }
      }

      toast({
        title: 'Success',
        description: `Service package ${packageData ? 'updated' : 'created'} successfully`,
      });
      onClose(true);
    } catch (error) {
      console.error('Error saving service package:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save service package',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {packageData ? 'Edit Service Package' : 'Create Service Package'}
          </DialogTitle>
          <DialogDescription>
            Define a service package with required parts and intervals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marine Engine Oil Change"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this service package..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="intervalValue">Service Interval *</Label>
              <Input
                id="intervalValue"
                type="number"
                value={intervalValue}
                onChange={(e) => setIntervalValue(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalMetric">Interval Type</Label>
              <Select value={intervalMetric} onValueChange={setIntervalMetric}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="active">Active</Label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg">Required Parts</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Part Name *</Label>
                    <Input
                      value={item.part_name}
                      onChange={(e) => updateItem(index, 'part_name', e.target.value)}
                      placeholder="e.g., Oil Filter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Part Number</Label>
                    <Input
                      value={item.part_number || ''}
                      onChange={(e) => updateItem(index, 'part_number', e.target.value)}
                      placeholder="SKU/Part #"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => updateItem(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Additional info..."
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No parts added yet</p>
                <p className="text-sm">Click "Add Part" to add parts to this service package</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : packageData ? 'Update Package' : 'Create Package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
