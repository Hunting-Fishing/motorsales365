import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectorId: string;
  onSuccess: () => void;
}
export const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({
  open,
  onOpenChange,
  sectorId,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('insert_service_category', {
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_position: null
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Category created successfully"
      });

      // Reset form
      setName('');
      setDescription('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-50 rounded">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input id="category-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Engine, Brakes, Suspension" disabled={isLoading} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category-description">Description</Label>
            <Textarea id="category-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description of this category" disabled={isLoading} rows={3} />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>;
};