
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  status: string;
}

interface InventoryItemSelectorProps {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  inventoryItems: InventoryItem[];
  onAddItem: (item: InventoryItem) => void;
}

export const InventoryItemSelector: React.FC<InventoryItemSelectorProps> = ({
  showDialog,
  setShowDialog,
  inventoryItems,
  onAddItem,
}) => {
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Inventory Item</DialogTitle>
          <DialogDescription>
            Choose items from inventory to add to the work order.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto mt-4">
          <div className="space-y-3">
            {inventoryItems.map((item) => (
              <div 
                key={item.id} 
                className="flex justify-between items-center p-3 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                onClick={() => onAddItem(item)}
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-slate-500">
                    {item.sku} - ${item.unitPrice.toFixed(2)} - {item.status}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
