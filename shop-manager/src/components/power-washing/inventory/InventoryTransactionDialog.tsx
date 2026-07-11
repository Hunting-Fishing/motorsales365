import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useCreateTransaction,
  TransactionType,
  InventoryItem
} from '@/hooks/power-washing/usePowerWashingInventory';
import { Loader2, Plus, Minus, RefreshCw, ArrowRightLeft } from 'lucide-react';

interface InventoryTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

const transactionTypes: { value: TransactionType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'received', label: 'Add Stock', icon: Plus, description: 'Add items from a purchase or delivery' },
  { value: 'used', label: 'Record Usage', icon: Minus, description: 'Deduct items used on a job' },
  { value: 'adjusted', label: 'Adjustment', icon: RefreshCw, description: 'Correct stock count after inventory check' },
  { value: 'transferred', label: 'Transfer', icon: ArrowRightLeft, description: 'Move items to another location' },
];

export function InventoryTransactionDialog({ 
  open, 
  onOpenChange, 
  item 
}: InventoryTransactionDialogProps) {
  const createTransaction = useCreateTransaction();
  
  const [transactionType, setTransactionType] = useState<TransactionType>('received');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setQuantity(0);
      setNotes('');
    }
  }, [open]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || quantity === 0) return;

    // For 'used' transactions, quantity should be negative
    const quantityChange = transactionType === 'used' ? -Math.abs(quantity) : Math.abs(quantity);

    await createTransaction.mutateAsync({
      inventory_item_id: item.id,
      transaction_type: transactionType,
      quantity_change: quantityChange,
      notes: notes || undefined,
    });
    
    onOpenChange(false);
  };

  const getNewQuantity = () => {
    const currentQty = Number(item.quantity);
    const change = transactionType === 'used' ? -Math.abs(quantity) : Math.abs(quantity);
    return Math.max(0, currentQty + change);
  };

  const selectedType = transactionTypes.find(t => t.value === transactionType);
  const Icon = selectedType?.icon || Plus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            {item.name} — Current stock: {item.quantity} {item.unit_of_measure}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {transactionTypes.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <Button
                    key={type.value}
                    type="button"
                    variant={transactionType === type.value ? 'default' : 'outline'}
                    className="flex flex-col h-auto py-3 px-3"
                    onClick={() => setTransactionType(type.value)}
                  >
                    <TypeIcon className="h-4 w-4 mb-1" />
                    <span className="text-sm font-medium">{type.label}</span>
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{selectedType?.description}</p>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity ({item.unit_of_measure})
            </Label>
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <Input
                id="quantity"
                type="number"
                min="0.01"
                step="0.01"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Enter quantity"
                className="text-lg"
                required
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">New Stock Level:</span>
              <span className="text-lg font-bold">
                {getNewQuantity()} {item.unit_of_measure}
              </span>
            </div>
            {getNewQuantity() <= item.reorder_point && item.reorder_point > 0 && (
              <p className="text-sm text-amber-500 mt-2">
                ⚠️ This will put stock at or below reorder point
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                transactionType === 'used' 
                  ? 'e.g., Job #123, Smith residence'
                  : transactionType === 'received'
                  ? 'e.g., PO #456, Vendor delivery'
                  : 'Reason for adjustment...'
              }
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransaction.isPending || !quantity}>
              {createTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
