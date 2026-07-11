import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { usePPEManagement } from '@/hooks/usePPEManagement';

const PPE_CATEGORIES = [
  'Head Protection',
  'Eye Protection',
  'Hearing Protection',
  'Respiratory Protection',
  'Hand Protection',
  'Foot Protection',
  'Body Protection',
  'Fall Protection',
  'High Visibility',
  'Other',
];

export const AddPPEItemDialog = () => {
  const [open, setOpen] = useState(false);
  const { createInventoryItem } = usePPEManagement();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    manufacturer: '',
    model_number: '',
    quantity_in_stock: 0,
    minimum_stock_level: 5,
    unit_cost: 0,
    expiry_tracking: false,
    inspection_frequency_days: 30,
    certification_required: false,
    storage_location: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createInventoryItem.mutateAsync(formData);
    setOpen(false);
    setFormData({
      name: '',
      category: '',
      description: '',
      manufacturer: '',
      model_number: '',
      quantity_in_stock: 0,
      minimum_stock_level: 5,
      unit_cost: 0,
      expiry_tracking: false,
      inspection_frequency_days: 30,
      certification_required: false,
      storage_location: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add PPE Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add PPE Item to Inventory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Item Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Safety Helmet"
                required
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PPE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Storage Location</Label>
              <Input
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="e.g., Warehouse A"
              />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
            <div>
              <Label>Model Number</Label>
              <Input
                value={formData.model_number}
                onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Quantity in Stock</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Minimum Stock Level</Label>
              <Input
                type="number"
                min="0"
                value={formData.minimum_stock_level}
                onChange={(e) => setFormData({ ...formData, minimum_stock_level: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Unit Cost ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Inspection Frequency (days)</Label>
              <Input
                type="number"
                min="1"
                value={formData.inspection_frequency_days}
                onChange={(e) => setFormData({ ...formData, inspection_frequency_days: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.expiry_tracking}
                onCheckedChange={(checked) => setFormData({ ...formData, expiry_tracking: checked })}
              />
              <Label>Track Expiry Dates</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.certification_required}
                onCheckedChange={(checked) => setFormData({ ...formData, certification_required: checked })}
              />
              <Label>Certification Required</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInventoryItem.isPending || !formData.name || !formData.category}>
              {createInventoryItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
