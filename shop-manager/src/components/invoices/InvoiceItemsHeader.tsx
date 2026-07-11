
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryItemSelector } from "./InventoryItemSelector";
import { InventoryItem } from "@/types/inventory"; 

interface InvoiceItemsHeaderProps {
  inventoryItems: InventoryItem[];
  showInventoryDialog: boolean;
  setShowInventoryDialog: (show: boolean) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
  onAddLaborItem: () => void;
}

export function InvoiceItemsHeader({
  inventoryItems,
  showInventoryDialog,
  setShowInventoryDialog,
  onAddInventoryItem,
  onAddLaborItem,
}: InvoiceItemsHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-medium">Invoice Items</h2>
      <div className="flex gap-2">
        <InventoryItemSelector
          inventoryItems={inventoryItems}
          showInventoryDialog={showInventoryDialog}
          setShowInventoryDialog={setShowInventoryDialog}
          onAddInventoryItem={onAddInventoryItem}
        />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={onAddLaborItem}
        >
          <Plus className="h-4 w-4" />
          Add Labor
        </Button>
      </div>
    </div>
  );
}
