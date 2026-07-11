
import { supabase } from "@/integrations/supabase/client";
import { WorkOrderInventoryItem } from "@/types/workOrder";

/**
 * Get inventory items for a work order
 */
export const getWorkOrderInventoryItems = async (workOrderId: string): Promise<WorkOrderInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('work_order_inventory_items')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price
    })) || [];
  } catch (error) {
    console.error('Error fetching work order inventory items:', error);
    return [];
  }
};

/**
 * Add inventory item to work order
 */
export const addInventoryItemToWorkOrder = async (
  workOrderId: string,
  item: Omit<WorkOrderInventoryItem, 'id' | 'total'>
): Promise<WorkOrderInventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('work_order_inventory_items')
      .insert({
        work_order_id: workOrderId,
        name: item.name,
        sku: item.sku,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price
      })
      .select();
      
    if (error) throw error;
    
    const newItem = data?.[0];
    if (newItem) {
      return {
        id: newItem.id,
        name: newItem.name,
        sku: newItem.sku,
        category: newItem.category,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        total: newItem.quantity * newItem.unit_price
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error adding inventory item to work order:', error);
    return null;
  }
};

/**
 * Remove inventory item from work order
 */
export const removeInventoryItemFromWorkOrder = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('work_order_inventory_items')
      .delete()
      .eq('id', itemId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error removing inventory item from work order:', error);
    return false;
  }
};
