import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateWaterDeliveryPart, CreatePartData } from '@/hooks/water-delivery/useWaterDeliveryParts';
import { 
  useCategoryOptions, 
  useWaterDeliveryInventorySubcategories 
} from '@/hooks/water-delivery/useWaterDeliveryInventoryCategories';
import { AddCategoryDialog } from './inventory/AddCategoryDialog';
import { AddSubcategoryDialog } from './inventory/AddSubcategoryDialog';
import { Plus, Loader2 } from 'lucide-react';

interface AddWaterDeliveryPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UNITS = [
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'roll', label: 'Roll' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'foot', label: 'Foot' },
  { value: 'pack', label: 'Pack' },
  { value: 'set', label: 'Set' },
];

export function AddWaterDeliveryPartDialog({ open, onOpenChange }: AddWaterDeliveryPartDialogProps) {
  const createPart = useCreateWaterDeliveryPart();
  const { categories, isLoading: loadingCategories } = useCategoryOptions();
  
  const [formData, setFormData] = useState<CreatePartData>({
    name: '',
    category: '',
    quantity: 0,
    unit_of_measure: 'each',
    min_quantity: 0,
  });

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addSubcategoryOpen, setAddSubcategoryOpen] = useState(false);

  // Get the selected category for subcategory fetching
  const selectedCategory = categories.find(c => c.value === formData.category);
  const { data: subcategories = [], isLoading: loadingSubcategories } = useWaterDeliveryInventorySubcategories(
    selectedCategory?.id || undefined
  );

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0].value }));
    }
  }, [categories, formData.category]);

  // Reset subcategory when category changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, subcategory: '' }));
  }, [formData.category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createPart.mutateAsync(formData);
    
    setFormData({
      name: '',
      category: categories.length > 0 ? categories[0].value : '',
      quantity: 0,
      unit_of_measure: 'each',
      min_quantity: 0,
    });
    onOpenChange(false);
  };

  const handleCategoryChange = (value: string) => {
    if (value === '__add_new__') {
      setAddCategoryOpen(true);
    } else {
      setFormData({ ...formData, category: value });
    }
  };

  const handleSubcategoryChange = (value: string) => {
    if (value === '__add_new__') {
      setAddSubcategoryOpen(true);
    } else {
      setFormData({ ...formData, subcategory: value });
    }
  };

  const handleCategoryCreated = (category: { id: string; slug: string; name: string }) => {
    setFormData(prev => ({ ...prev, category: category.slug }));
  };

  const handleSubcategoryCreated = (subcategory: { id: string; slug: string; name: string }) => {
    setFormData(prev => ({ ...prev, subcategory: subcategory.name }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Sediment Filter 10 Micron"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="part_number">Part Number</Label>
                <Input
                  id="part_number"
                  value={formData.part_number || ''}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  placeholder="e.g., SF-10M-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    {loadingCategories ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Select category" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="text-primary font-medium">
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Category...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                {selectedCategory?.id ? (
                  <Select
                    value={formData.subcategory || ''}
                    onValueChange={handleSubcategoryChange}
                    disabled={loadingSubcategories}
                  >
                    <SelectTrigger>
                      {loadingSubcategories ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select subcategory (optional)" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.name}>
                          {sub.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_new__" className="text-primary font-medium">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add New Subcategory...
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="subcategory"
                    value={formData.subcategory || ''}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    placeholder="e.g., Carbon Filters"
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter item description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Initial Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity || 0}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">Unit</Label>
                <Select
                  value={formData.unit_of_measure || 'each'}
                  onValueChange={(value) => setFormData({ ...formData, unit_of_measure: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min_quantity">Min Stock Level</Label>
                <Input
                  id="min_quantity"
                  type="number"
                  min="0"
                  value={formData.min_quantity || 0}
                  onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price ($)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price || ''}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="retail_price">Retail Price ($)</Label>
                <Input
                  id="retail_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.retail_price || ''}
                  onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storage_location">Storage Location</Label>
                <Input
                  id="storage_location"
                  value={formData.storage_location || ''}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  placeholder="e.g., Warehouse A"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bin_number">Bin Number</Label>
                <Input
                  id="bin_number"
                  value={formData.bin_number || ''}
                  onChange={(e) => setFormData({ ...formData, bin_number: e.target.value })}
                  placeholder="e.g., A1-03"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPart.isPending}>
                {createPart.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddCategoryDialog 
        open={addCategoryOpen} 
        onOpenChange={setAddCategoryOpen}
        onCategoryCreated={handleCategoryCreated}
      />

      {selectedCategory?.id && (
        <AddSubcategoryDialog 
          open={addSubcategoryOpen} 
          onOpenChange={setAddSubcategoryOpen}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.label}
          onSubcategoryCreated={handleSubcategoryCreated}
        />
      )}
    </>
  );
}
