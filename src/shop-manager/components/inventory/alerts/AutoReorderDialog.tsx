
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
import { InventoryItemExtended, AutoReorderSettings } from '@/types/inventory';

interface AutoReorderDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItemExtended;
  currentSettings?: AutoReorderSettings;
  onSave: (threshold: number, quantity: number) => void;
}

const AutoReorderDialog: React.FC<AutoReorderDialogProps> = ({
  open,
  onClose,
  item,
  currentSettings,
  onSave
}) => {
  const [threshold, setThreshold] = useState<number>(
    currentSettings?.threshold || item.reorder_point || 5
  );
  const [quantity, setQuantity] = useState<number>(
    currentSettings?.quantity || 10
  );

  const handleSave = () => {
    onSave(threshold, quantity);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Auto-Reorder</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Item</Label>
            <Input id="item-name" value={item.name} readOnly className="bg-gray-50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">Reorder Threshold</Label>
            <Input
              id="threshold"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={1}
            />
            <p className="text-sm text-gray-500">
              Auto-reorder will be triggered when stock falls below this level
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Reorder Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
            />
            <p className="text-sm text-gray-500">
              This many units will be ordered automatically
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoReorderDialog;
