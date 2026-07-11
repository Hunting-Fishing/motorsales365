import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AddSubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
  onSuccess: () => void;
}

export const AddSubcategoryDialog: React.FC<AddSubcategoryDialogProps> = ({
  open,
  onOpenChange,
  categoryId,
  categoryName,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Subcategory name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('insert_service_subcategory', {
        p_category_id: categoryId,
        p_name: name.trim(),
        p_description: description.trim() || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory created successfully"
      });

      // Reset form
      setName('');
      setDescription('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating subcategory:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create subcategory",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Subcategory</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adding to category: <span className="font-medium">{categoryName}</span>
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subcategory-name">Subcategory Name *</Label>
            <Input
              id="subcategory-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brake Pads, Oil Filters, Control Arms"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subcategory-description">Description</Label>
            <Textarea
              id="subcategory-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this subcategory"
              disabled={isLoading}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Subcategory
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};