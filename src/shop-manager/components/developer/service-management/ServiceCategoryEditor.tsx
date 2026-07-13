import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ServiceMainCategory } from '@/types/service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Plus, Trash2 } from 'lucide-react';

interface ServiceCategoryEditorProps {
  open: boolean;
  category?: ServiceMainCategory;
  onClose: () => void;
  onSave: (category: Omit<ServiceMainCategory, 'id'>) => void;
  onUpdate: (category: ServiceMainCategory) => void;
  onDelete: (categoryId: string) => void;
}

export function ServiceCategoryEditor({
  open,
  category,
  onClose,
  onSave,
  onUpdate,
  onDelete
}: ServiceCategoryEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (category) {
      setIsEditMode(true);
      setName(category.name);
      setDescription(category.description || '');
    } else {
      setIsEditMode(false);
      setName('');
      setDescription('');
    }
  }, [category]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (isEditMode && category) {
        // Update existing category
        const updatedCategory = { ...category, name, description };
        onUpdate(updatedCategory);
        toast({
          title: "Category Updated",
          description: "Service category has been updated successfully.",
        });
      } else {
        // Create new category
        const newCategory = { name, description, subcategories: [] };
        onSave(newCategory);
        toast({
          title: "Category Created",
          description: "New service category has been created successfully.",
        });
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save service category.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (category) {
      setIsLoading(true);
      try {
        onDelete(category.id);
        toast({
          title: "Category Deleted",
          description: "Service category has been deleted successfully.",
        });
        onClose();
      } catch (error: any) {
        console.error("Error deleting category:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to delete service category.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update an existing service category." : "Create a new service category."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Category description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {isEditMode && category && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
              Delete
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              "Saving..."
            ) : (
              <>
                {isEditMode ? "Update" : "Save"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
