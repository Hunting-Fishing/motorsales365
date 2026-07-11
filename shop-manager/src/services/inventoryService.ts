
import { 
  getInventoryItems,
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem,
  getInventoryCategories,
  getInventorySuppliers,
  getInventoryLocations,
  filterInventoryItems,
  calculateTotalValue
} from "./inventory/index";

import { supabase } from "@/lib/supabase";
import { InventoryItemExtended } from "@/types/inventory";

export { 
  getInventoryItems,
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem,
  getInventoryCategories,
  getInventorySuppliers,
  getInventoryLocations,
  filterInventoryItems,
  calculateTotalValue
};

export const getInventoryStatistics = async () => {
  try {
    console.log('getInventoryStatistics: Starting to calculate stats...');
    const items = await getInventoryItems();
    console.log('getInventoryStatistics: Retrieved items:', items.length);
    
    const totalItems = items.length;
    const totalValue = calculateTotalValue(items);
    const lowStockCount = items.filter(item => {
      const quantity = Number(item.quantity) || 0;
      const reorderPoint = Number(item.reorder_point) || 0;
      return quantity > 0 && quantity <= reorderPoint;
    }).length;
    const outOfStockCount = items.filter(item => {
      const quantity = Number(item.quantity) || 0;
      return quantity <= 0;
    }).length;
    
    const stats = {
      totalItems,
      totalValue,
      lowStockCount,
      outOfStockCount
    };
    
    console.log('getInventoryStatistics: Calculated stats:', stats);
    return stats;
  } catch (error) {
    console.error("Error getting inventory statistics:", error);
    return {
      totalItems: 0,
      totalValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    };
  }
};

export const bulkUpdateInventory = async (items: InventoryItemExtended[]) => {
  const { data, error } = await supabase.from('inventory_items').upsert(
    items.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      reorder_point: item.reorder_point,
      unit_price: item.unit_price,
      supplier: item.supplier,
      location: item.location,
      status: item.status,
      updated_at: new Date().toISOString()
    }))
  );

  if (error) {
    console.error("Error bulk updating inventory:", error);
    throw error;
  }

  return data;
};

export const clearAllInventoryItems = async () => {
  try {
    // First get all inventory items to check if there are any
    const { data: items, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id');
      
    if (fetchError) throw fetchError;
    
    if (!items || items.length === 0) {
      // No items to delete
      return true;
    }
      
    // Delete all inventory items
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .gte('id', '0'); // Use a condition that matches all items
    
    if (deleteError) throw deleteError;
    
    return true;
  } catch (error) {
    console.error("Error clearing inventory:", error);
    throw error;
  }
};
