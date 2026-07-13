import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AddSectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddSectorDialog: React.FC<AddSectorDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Sector name is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('insert_service_sector', {
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_position: position === '' ? null : Number(position)
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sector created successfully"
      });

      // Reset form
      setName('');
      setDescription('');
      setPosition('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating sector:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create sector",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Sector</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sector-name">Sector Name *</Label>
            <Input
              id="sector-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Automotive Services"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sector-description">Description</Label>
            <Textarea
              id="sector-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the sector"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="sector-position">Display Position</Label>
            <Input
              id="sector-position"
              type="number"
              value={position}
              onChange={(e) => setPosition(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Optional display order"
              min="0"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Sector
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};