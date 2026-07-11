
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InventoryItemExtended } from "@/types/inventory";

interface InventoryAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItemExtended;
  onSubmit: (data: {
    itemId: string;
    quantityChange: number;
    reason: string;
    notes: string;
  }) => void;
}

const ADJUSTMENT_REASONS = [
  "Count Correction",
  "Damaged/Defective",
  "Used in Shop",
  "Returned from Customer",
  "Internal Use",
  "Theft/Loss",
  "Vendor Return",
  "Cycle Count",
  "Write-Off",
  "Other"
];

export function InventoryAdjustmentDialog({
  open,
  onClose,
  item,
  onSubmit
}: InventoryAdjustmentDialogProps) {
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [reason, setReason] = useState<string>(ADJUSTMENT_REASONS[0]);
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      itemId: item.id,
      quantityChange,
      reason,
      notes
    });
    
    // Reset form
    setQuantityChange(0);
    setReason(ADJUSTMENT_REASONS[0]);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Inventory Quantity</DialogTitle>
          <DialogDescription>
            Update the quantity for {item.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="current-qty">Current Quantity</Label>
              <Input
                id="current-qty"
                value={item.quantity}
                disabled
                className="bg-slate-100"
              />
            </div>
            <div>
              <Label htmlFor="qty-change">Quantity Change</Label>
              <Input
                id="qty-change"
                type="number"
                value={quantityChange}
                onChange={(e) => setQuantityChange(Number(e.target.value))}
                required
                className={quantityChange < 0 ? "border-red-300 text-red-600" : quantityChange > 0 ? "border-green-300 text-green-600" : ""}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="new-qty">New Quantity</Label>
            <Input
              id="new-qty"
              value={item.quantity + quantityChange}
              disabled
              className="bg-slate-100"
            />
          </div>
          
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional details about this adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="default"
              className={quantityChange < 0 ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {quantityChange < 0 ? "Decrease" : quantityChange > 0 ? "Increase" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
