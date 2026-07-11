import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useStockTransfer } from '@/hooks/inventory/useStockTransfer';
import { useForm } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';

interface StockTransferDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  currentLocation: string;
  availableQuantity: number;
}

interface FormData {
  to_location: string;
  quantity: number;
  notes?: string;
  transferred_by?: string;
}

export function StockTransferDialog({ 
  open, 
  onClose, 
  itemId, 
  itemName,
  currentLocation,
  availableQuantity 
}: StockTransferDialogProps) {
  const { transferStock, isTransferring } = useStockTransfer();
  const { register, handleSubmit, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      await transferStock({
        inventory_item_id: itemId,
        from_location: currentLocation,
        to_location: data.to_location,
        quantity: Number(data.quantity),
        notes: data.notes,
        transferred_by: data.transferred_by
      });
      reset();
      onClose();
    } catch (error) {
      console.error('Error transferring stock:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg mb-4">
          <p className="text-sm font-medium mb-2">{itemName}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{currentLocation}</span>
            <ArrowRight className="h-4 w-4" />
            <span>New Location</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Available: {availableQuantity} units
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to_location">To Location *</Label>
            <Input
              id="to_location"
              placeholder="e.g., Shelf B3, Warehouse 2"
              {...register('to_location', { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={availableQuantity}
              placeholder={`Max: ${availableQuantity}`}
              {...register('quantity', { 
                required: true, 
                valueAsNumber: true,
                min: 1,
                max: availableQuantity 
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferred_by">Transferred By</Label>
            <Input
              id="transferred_by"
              placeholder="Your name"
              {...register('transferred_by')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Transfer notes"
              rows={2}
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isTransferring}>
              {isTransferring ? 'Transferring...' : 'Transfer Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
