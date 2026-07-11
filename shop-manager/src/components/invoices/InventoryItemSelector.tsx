
import React from "react";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InventoryItem } from "@/types/inventory"; 

interface InventoryItemSelectorProps {
  inventoryItems: InventoryItem[];
  showInventoryDialog: boolean;
  setShowInventoryDialog: (show: boolean) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
}

export function InventoryItemSelector({
  inventoryItems,
  showInventoryDialog,
  setShowInventoryDialog,
  onAddInventoryItem,
}: InventoryItemSelectorProps) {
  return (
    <Dialog open={showInventoryDialog} onOpenChange={setShowInventoryDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Package className="h-4 w-4" />
          Add Inventory Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Select Inventory Item</DialogTitle>
          <DialogDescription>
            Choose items from inventory to add to the invoice.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto">
          <div className="space-y-4 mt-2">
            {inventoryItems.map((item) => (
              <div 
                key={item.id} 
                className="flex justify-between items-center p-3 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                onClick={() => onAddInventoryItem(item)}
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-slate-500">
                    {item.sku} - ${(item.price || item.unit_price || 0).toFixed(2)}
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
}
