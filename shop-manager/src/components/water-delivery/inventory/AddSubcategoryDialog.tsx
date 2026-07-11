import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateInventorySubcategory } from '@/hooks/water-delivery/useWaterDeliveryInventoryCategories';
import { Plus } from 'lucide-react';

interface AddSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  onSubcategoryCreated?: (subcategory: { id: string; slug: string; name: string }) => void;
}

export function AddSubcategoryDialog({ 
  open, 
  onOpenChange, 
  categoryId,
  categoryName,
  onSubcategoryCreated 
}: AddSubcategoryDialogProps) {
  const createSubcategory = useCreateInventorySubcategory();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !categoryId) return;

    const result = await createSubcategory.mutateAsync({
      category_id: categoryId,
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (result && onSubcategoryCreated) {
      onSubcategoryCreated({ id: result.id, slug: result.slug, name: result.name });
    }

    setName('');
    setDescription('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Subcategory
          </DialogTitle>
          <DialogDescription>
            Create a subcategory under <span className="font-medium">{categoryName}</span>. This helps organize your inventory more specifically.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subcategory-name">Subcategory Name *</Label>
            <Input
              id="subcategory-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sediment Filters"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory-description">Description (Optional)</Label>
            <Textarea
              id="subcategory-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this subcategory..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSubcategory.isPending || !name.trim()}>
              {createSubcategory.isPending ? 'Creating...' : 'Create Subcategory'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
