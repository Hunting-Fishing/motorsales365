
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface SpecialOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workOrderId: string;
  jobLineId?: string;
  onPartAdded: () => void;
}

export function SpecialOrderDialog({
  open,
  onOpenChange,
  workOrderId,
  jobLineId,
  onPartAdded
}: SpecialOrderDialogProps) {
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!partName.trim() || !partNumber.trim()) {
      toast({
        title: "Error",
        description: "Part name and part number are required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const partData = {
        work_order_id: workOrderId,
        job_line_id: jobLineId || null,
        part_name: partName,
        part_number: partNumber,
        description: description || null,
        category: category || null,
        quantity: quantity,
        customer_price: unitPrice,
        supplier_cost: 0,
        part_type: 'special_order',
        status: 'pending'
      };

      const { error } = await supabase
        .from('work_order_parts')
        .insert([partData]);

      if (error) {
        console.error('Error adding special order part:', error);
        toast({
          title: "Error",
          description: "Failed to add special order part",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: "Special order part added successfully"
      });

      // Reset form
      setPartName('');
      setPartNumber('');
      setDescription('');
      setQuantity(1);
      setUnitPrice(0);
      setCategory('');
      
      onPartAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding special order part:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Special Order Part</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partName">Part Name *</Label>
              <Input
                id="partName"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="Enter part name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partNumber">Part Number *</Label>
              <Input
                id="partNumber"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="Enter part number"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter part description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engine">Engine</SelectItem>
                <SelectItem value="transmission">Transmission</SelectItem>
                <SelectItem value="brakes">Brakes</SelectItem>
                <SelectItem value="suspension">Suspension</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="body">Body</SelectItem>
                <SelectItem value="fluids">Fluids</SelectItem>
                <SelectItem value="filters">Filters</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Part'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
