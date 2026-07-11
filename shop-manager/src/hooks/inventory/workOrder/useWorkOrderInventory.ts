
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { WorkOrderFormValues, WorkOrderInventoryItem } from "@/types/workOrder";
import { InventoryItemExtended } from "@/types/inventory";

export const useWorkOrderInventory = (form: UseFormReturn<WorkOrderFormValues>) => {
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get the current items from form
  const items = form.watch("inventoryItems") || [];
  
  // Handle adding a new inventory item
  const handleAddItem = (selectedItem: InventoryItemExtended) => {
    try {
      setIsAdding(true);
      
      // Check if item already exists
      const existingItemIndex = items.findIndex(item => item.id === selectedItem.id);
      
      if (existingItemIndex >= 0) {
        // Item exists, increase quantity
        handleUpdateQuantity(selectedItem.id, items[existingItemIndex].quantity + 1);
        return;
      }
      
      // Add new item
      const newItem = {
        id: selectedItem.id,
        name: selectedItem.name,
        sku: selectedItem.sku,
        category: selectedItem.category || '',
        quantity: 1,
        unit_price: selectedItem.unit_price,
        total: selectedItem.unit_price
      };
      
      const currentItems = form.getValues("inventoryItems") || [];
      form.setValue("inventoryItems", [...currentItems, newItem], { shouldValidate: true });
    } finally {
      setIsAdding(false);
    }
  };
  
  // Handle removing an inventory item
  const handleRemoveItem = (itemId: string) => {
    const currentItems = form.getValues("inventoryItems") || [];
    form.setValue(
      "inventoryItems",
      currentItems.filter(item => item.id !== itemId),
      { shouldValidate: true }
    );
  };
  
  // Handle updating item quantity
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    setIsUpdating(true);
    
    try {
      const currentItems = form.getValues("inventoryItems") || [];
      const updatedItems = currentItems.map(item => {
        if (item.id === itemId) {
          const quantity = Math.max(1, newQuantity); // Ensure minimum 1
          return {
            ...item,
            quantity,
            total: quantity * item.unit_price
          };
        }
        return item;
      });
      
      form.setValue("inventoryItems", updatedItems, { shouldValidate: true });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return {
    showInventoryDialog,
    setShowInventoryDialog,
    isAdding,
    isUpdating,
    items,
    handleAddItem,
    handleRemoveItem,
    handleUpdateQuantity,
  };
};
