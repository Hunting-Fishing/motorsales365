
import React from "react";
import { InvoiceItemsHeader } from "./InvoiceItemsHeader";
import { InvoiceItemsTable } from "./InvoiceItemsTable";
import { InvoiceItem } from "@/types/invoice";
import { InventoryItem } from "@/types/inventory";

interface InvoiceItemsManagerProps {
  items: InvoiceItem[];
  inventoryItems: InventoryItem[];
  showInventoryDialog: boolean;
  setShowInventoryDialog: (show: boolean) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
  onAddLaborItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItemQuantity: (id: string, quantity: number) => void;
  onUpdateItemDescription: (id: string, description: string) => void;
  onUpdateItemPrice: (id: string, price: number) => void;
}

export function InvoiceItemsManager({
  items,
  inventoryItems,
  showInventoryDialog,
  setShowInventoryDialog,
  onAddInventoryItem,
  onAddLaborItem,
  onRemoveItem,
  onUpdateItemQuantity,
  onUpdateItemDescription,
  onUpdateItemPrice,
}: InvoiceItemsManagerProps) {
  return (
    <>
      <InvoiceItemsHeader
        inventoryItems={inventoryItems}
        showInventoryDialog={showInventoryDialog}
        setShowInventoryDialog={setShowInventoryDialog}
        onAddInventoryItem={onAddInventoryItem}
        onAddLaborItem={onAddLaborItem}
      />
      
      <InvoiceItemsTable
        items={items}
        onRemoveItem={onRemoveItem}
        onUpdateItemQuantity={onUpdateItemQuantity}
        onUpdateItemDescription={onUpdateItemDescription}
        onUpdateItemPrice={onUpdateItemPrice}
      />
    </>
  );
}
