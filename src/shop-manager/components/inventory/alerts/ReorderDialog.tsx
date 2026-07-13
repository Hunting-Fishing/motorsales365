
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InventoryItemExtended } from '@/types/inventory';

interface ReorderDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItemExtended;
  onReorder: (itemId: string, quantity: number) => Promise<void>;
}

const ReorderDialog: React.FC<ReorderDialogProps> = ({
  open,
  onClose,
  item,
  onReorder
}) => {
  const [quantity, setQuantity] = useState<number>(item.reorder_point * 2 || 10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReorder = async () => {
    try {
      setIsSubmitting(true);
      await onReorder(item.id, quantity);
      onClose();
    } catch (err) {
      console.error("Error during reorder:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reorder Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item</Label>
            <Input id="item-name" value={item.name} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <Label htmlFor="sku">SKU</Label>
              <span className="text-xs text-muted-foreground">Current stock: {item.quantity}</span>
            </div>
            <Input id="sku" value={item.sku} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Order Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleReorder} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Place Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReorderDialog;
