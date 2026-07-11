import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecordPartTransaction, WaterDeliveryPart } from '@/hooks/water-delivery/useWaterDeliveryParts';

interface WaterDeliveryPartTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: WaterDeliveryPart | null;
  defaultType?: 'received' | 'used';
}

const TRANSACTION_TYPES = [
  { value: 'received', label: 'Receive Stock', quantitySign: 1 },
  { value: 'used', label: 'Use/Consume', quantitySign: -1 },
  { value: 'adjustment', label: 'Adjustment', quantitySign: 1 },
  { value: 'returned', label: 'Return to Supplier', quantitySign: -1 },
  { value: 'damaged', label: 'Mark as Damaged', quantitySign: -1 },
];

export function WaterDeliveryPartTransactionDialog({ 
  open, 
  onOpenChange, 
  part,
  defaultType = 'received'
}: WaterDeliveryPartTransactionDialogProps) {
  const recordTransaction = useRecordPartTransaction();
  
  const [transactionType, setTransactionType] = useState(defaultType);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!part) return;
    
    const txType = TRANSACTION_TYPES.find(t => t.value === transactionType);
    const signedQuantity = quantity * (txType?.quantitySign || 1);
    
    await recordTransaction.mutateAsync({
      part_id: part.id,
      transaction_type: transactionType,
      quantity: signedQuantity,
      unit_cost: unitCost,
      notes: notes || undefined,
      reference_type: 'manual',
    });
    
    // Reset form
    setQuantity(1);
    setUnitCost(undefined);
    setNotes('');
    onOpenChange(false);
  };

  if (!part) return null;

  const txType = TRANSACTION_TYPES.find(t => t.value === transactionType);
  const isDeduction = txType?.quantitySign === -1;
  const newQuantity = part.quantity + (quantity * (txType?.quantitySign || 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Transaction</DialogTitle>
        </DialogHeader>
        
        <div className="p-3 bg-muted rounded-lg mb-4">
          <p className="font-medium">{part.name}</p>
          <p className="text-sm text-muted-foreground">
            Current Stock: {part.quantity} {part.unit_of_measure}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as typeof transactionType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              required
            />
            <p className={`text-sm ${newQuantity < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
              New stock level: {Math.max(0, newQuantity)} {part.unit_of_measure}
              {isDeduction && quantity > part.quantity && (
                <span className="text-destructive ml-2">(exceeds available stock)</span>
              )}
            </p>
          </div>

          {transactionType === 'received' && (
            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost ($)</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost || ''}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || undefined)}
                placeholder={part.cost_price ? part.cost_price.toString() : '0.00'}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., PO #12345, Work order reference, reason for adjustment..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={recordTransaction.isPending || (isDeduction && quantity > part.quantity)}
              variant={isDeduction ? 'destructive' : 'default'}
            >
              {recordTransaction.isPending ? 'Recording...' : isDeduction ? 'Deduct Stock' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
