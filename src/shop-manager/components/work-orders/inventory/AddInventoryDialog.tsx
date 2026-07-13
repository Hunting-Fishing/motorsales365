
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem } from '@/types/inventory';

export interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddItem: (item: InventoryItem) => Promise<void>;
}

export function AddInventoryDialog({
  open,
  onOpenChange,
  onAddItem
}: AddInventoryDialogProps) {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (selectedItem) {
      const itemToAdd: InventoryItem = {
        ...selectedItem,
        quantity: quantity
      };
      
      await onAddItem(itemToAdd);
      onOpenChange(false);
      setSelectedItem(null);
      setQuantity(1);
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="item" className="text-right">
              Item
            </Label>
            <Select onValueChange={(value) => {
              // This would typically fetch from inventory items
              // For now, creating a sample item
              setSelectedItem({
                id: value,
                name: value,
                sku: value,
                category: 'General',
                price: 0,
                unit_price: 0,
                quantity: 1
              } as InventoryItem);
            }}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample-item">Sample Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="col-span-3"
              min="1"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedItem}>
            Add Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
