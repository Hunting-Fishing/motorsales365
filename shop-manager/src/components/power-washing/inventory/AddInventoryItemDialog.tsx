import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { 
  useCreateInventoryItem,
  useInventoryVendors,
  InventoryCategory,
  CreateInventoryItemInput
} from '@/hooks/power-washing/usePowerWashingInventory';
import { Loader2 } from 'lucide-react';

interface AddInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryOptions: { value: InventoryCategory; label: string }[] = [
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'parts', label: 'Parts & Fittings' },
  { value: 'safety_gear', label: 'Safety Gear' },
  { value: 'accessories', label: 'Accessories' },
];

const unitOptions = [
  'each', 'gallon', 'quart', 'liter', 'oz', 'lb', 'kg', 'pack', 'box', 'case', 'roll', 'set'
];

export function AddInventoryItemDialog({ open, onOpenChange }: AddInventoryItemDialogProps) {
  const { data: vendors } = useInventoryVendors();
  const createItem = useCreateInventoryItem();
  
  const [formData, setFormData] = useState<CreateInventoryItemInput>({
    name: '',
    category: 'chemicals',
    quantity: 0,
    unit_of_measure: 'each',
    reorder_point: 0,
    unit_cost: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createItem.mutateAsync(formData);
    
    // Reset form
    setFormData({
      name: '',
      category: 'chemicals',
      quantity: 0,
      unit_of_measure: 'each',
      reorder_point: 0,
      unit_cost: 0,
    });
    onOpenChange(false);
  };

  const updateField = <K extends keyof CreateInventoryItemInput>(
    field: K,
    value: CreateInventoryItemInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new item to your supplies and parts inventory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => updateField('category', value as InventoryCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Sodium Hypochlorite 12.5%"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => updateField('sku', e.target.value)}
                placeholder="e.g., SH-125-5GAL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of the item"
              rows={2}
            />
          </div>

          {/* Stock Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Initial Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity || ''}
                onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit of Measure</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(value) => updateField('unit_of_measure', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_point">Reorder Point</Label>
              <Input
                id="reorder_point"
                type="number"
                min="0"
                step="0.01"
                value={formData.reorder_point || ''}
                onChange={(e) => updateField('reorder_point', parseFloat(e.target.value) || 0)}
                placeholder="Alert when below"
              />
            </div>
          </div>

          {/* Cost and Location */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost ($)</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost || ''}
                onChange={(e) => updateField('unit_cost', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="e.g., Truck #1, Warehouse"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Select
                value={formData.vendor_id || ''}
                onValueChange={(value) => updateField('vendor_id', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category-specific fields */}
          {formData.category === 'chemicals' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dilution_ratio">Dilution Ratio</Label>
                <Input
                  id="dilution_ratio"
                  value={formData.dilution_ratio || ''}
                  onChange={(e) => updateField('dilution_ratio', e.target.value)}
                  placeholder="e.g., 10:1, 1%, 3oz/gal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sds_url">SDS Link (URL)</Label>
                <Input
                  id="sds_url"
                  type="url"
                  value={formData.sds_url || ''}
                  onChange={(e) => updateField('sds_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {(formData.category === 'chemicals' || formData.category === 'safety_gear') && (
            <div className="space-y-2">
              <Label htmlFor="expiration_date">Expiration Date</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date || ''}
                onChange={(e) => updateField('expiration_date', e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes about this item"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createItem.isPending || !formData.name}>
              {createItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
