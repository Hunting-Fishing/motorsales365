import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryItem } from "@/types/inventory";
import { InvoiceTemplate } from "@/types/invoice";

export interface InventoryItemSelectorProps {
  open?: boolean; // Make this compatible with both open and isOpen
  isOpen?: boolean;
  onClose: () => void;
  onSelect: (item: InventoryItem) => void;
  inventoryItems: InventoryItem[];
  templates: InvoiceTemplate[];
  onApplyTemplate: (template: InvoiceTemplate) => void;
}

export const InventoryItemSelector: React.FC<InventoryItemSelectorProps> = ({
  open,
  isOpen,
  onClose,
  onSelect,
  inventoryItems,
  templates,
  onApplyTemplate,
}) => {
  // Use either open or isOpen, defaulting to isOpen if both are provided
  const dialogOpen = isOpen !== undefined ? isOpen : (open || false);
  
  return (
    <Dialog open={dialogOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Inventory Items</DialogTitle>
        </DialogHeader>
        <div>Inventory selector content</div>
      </DialogContent>
    </Dialog>
  );
};
