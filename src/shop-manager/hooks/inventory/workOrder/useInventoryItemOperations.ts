
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { WorkOrderFormSchemaValues } from "@/schemas/workOrderSchema";
import { InventoryItemExtended } from "@/types/inventory";
import { WorkOrderInventoryItem } from "@/types/workOrder";

/**
 * Hook to manage inventory item operations in a work order form
 */
export const useInventoryItemOperations = (form: UseFormReturn<WorkOrderFormSchemaValues>) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get the current items from form
  const items = form.watch("inventoryItems") || [];

  /**
   * Add inventory item to work order
   */
  const addItem = async (inventoryItem: InventoryItemExtended) => {
    try {
      setIsAdding(true);
      
      // Check if item already exists
      const existingItemIndex = items.findIndex(item => item.id === inventoryItem.id);
      
      if (existingItemIndex >= 0) {
        // Item exists, increase quantity
        await updateQuantity(inventoryItem.id, items[existingItemIndex].quantity + 1);
        return;
      }
      
      // Add new item
      const newItem: WorkOrderInventoryItem = {
        id: inventoryItem.id,
        name: inventoryItem.name,
        sku: inventoryItem.sku,
        category: inventoryItem.category || '',
        quantity: 1,
        unit_price: inventoryItem.unit_price,
        total: inventoryItem.unit_price
      };
      
      const currentItems = form.getValues("inventoryItems") || [];
      form.setValue("inventoryItems", [...currentItems, newItem], { shouldValidate: true });
      
      return newItem;
    } catch (error) {
      console.error("Error adding inventory item:", error);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * Remove inventory item from work order
   */
  const removeItem = async (itemId: string) => {
    try {
      const currentItems = form.getValues("inventoryItems") || [];
      form.setValue(
        "inventoryItems",
        currentItems.filter(item => item.id !== itemId),
        { shouldValidate: true }
      );
      
      return true;
    } catch (error) {
      console.error("Error removing inventory item:", error);
      throw error;
    }
  };

  /**
   * Update inventory item quantity
   */
  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      setIsUpdating(true);
      
      const currentItems = form.getValues("inventoryItems") || [];
      const updatedItems = currentItems.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, quantity); // Ensure minimum 1
          return {
            ...item,
            quantity: newQuantity,
            total: newQuantity * item.unit_price
          };
        }
        return item;
      });
      
      form.setValue("inventoryItems", updatedItems, { shouldValidate: true });
      
      return updatedItems.find(item => item.id === itemId);
    } catch (error) {
      console.error("Error updating inventory quantity:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    items,
    isAdding,
    isUpdating,
    addItem,
    removeItem,
    updateQuantity,
  };
};
