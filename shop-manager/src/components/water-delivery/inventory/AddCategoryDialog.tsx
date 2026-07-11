import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateInventoryCategory } from '@/hooks/water-delivery/useWaterDeliveryInventoryCategories';
import { Plus } from 'lucide-react';

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (category: { id: string; slug: string; name: string }) => void;
}

export function AddCategoryDialog({ open, onOpenChange, onCategoryCreated }: AddCategoryDialogProps) {
  const createCategory = useCreateInventoryCategory();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const result = await createCategory.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    if (result && onCategoryCreated) {
      onCategoryCreated({ id: result.id, slug: result.slug, name: result.name });
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
            Add New Category
          </DialogTitle>
          <DialogDescription>
            Create a custom category for your inventory items. This category will be available for all future items.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Water Testing Equipment"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Description (Optional)</Label>
            <Textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this category..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCategory.isPending || !name.trim()}>
              {createCategory.isPending ? 'Creating...' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
