
import { WorkOrder, WorkOrderInventoryItem, TimeEntry } from "@/types/workOrder";
import { supabase } from "@/lib/supabase";
import { mapFromDbWorkOrder, mapTimeEntryFromDb, mapInventoryItemFromDb } from "@/utils/supabaseMappers";
import { 
  triggerWorkflowOnWorkOrderCreate, 
  triggerWorkflowOnWorkOrderStatusUpdate, 
  triggerWorkflowOnWorkOrderComplete 
} from "@/services/workflows/workflowEventService";

/**
 * Create a new work order
 */
export async function createWorkOrder(newWorkOrder: Partial<WorkOrder>): Promise<WorkOrder> {
  try {
    // Map properties to match database column names
    const workOrderData = {
      customer: newWorkOrder.customer,
      description: newWorkOrder.description,
      status: newWorkOrder.status,
      priority: newWorkOrder.priority,
      technician: newWorkOrder.technician,
      technician_id: newWorkOrder.technician_id,
      location: newWorkOrder.location,
      due_date: newWorkOrder.dueDate,
      notes: newWorkOrder.notes,
      // created_at automatically set by Supabase
    };

    const { data, error } = await supabase
      .from('work_orders')
      .insert([workOrderData] as any)
      .select();

    if (error) throw new Error(`Failed to create work order: ${error.message}`);
    if (!data || data.length === 0) throw new Error('No data returned after creating work order');

    // Add inventory items if any
    if (newWorkOrder.inventoryItems && newWorkOrder.inventoryItems.length > 0) {
      await addInventoryItemsToWorkOrder(data[0].id, newWorkOrder.inventoryItems);
    }

    const createdWorkOrder = await getWorkOrderById(data[0].id);
    
    // Trigger workflow for work order creation
    triggerWorkflowOnWorkOrderCreate(createdWorkOrder).catch(err => 
      console.error('Workflow trigger failed:', err)
    );
    
    return createdWorkOrder;
  } catch (error) {
    console.error('Error in createWorkOrder:', error);
    throw error;
  }
}

/**
 * Get all work orders
 */
export async function getWorkOrders(): Promise<WorkOrder[]> {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch work orders: ${error.message}`);

    const workOrders = await Promise.all(
      data.map(async (order) => {
        // Fetch time entries and inventory items for each work order
        const timeEntries = await getTimeEntriesForWorkOrder(order.id);
        const inventoryItems = await getInventoryItemsForWorkOrder(order.id);
        
        return mapFromDbWorkOrder(order, timeEntries, inventoryItems);
      })
    );

    return workOrders;
  } catch (error) {
    console.error('Error in getWorkOrders:', error);
    return [];
  }
}

/**
 * Get a work order by ID
 */
export async function getWorkOrderById(id: string): Promise<WorkOrder> {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to fetch work order: ${error.message}`);
    if (!data) throw new Error(`Work order not found: ${id}`);

    // Fetch time entries for this work order
    const timeEntries = await getTimeEntriesForWorkOrder(id);

    // Fetch inventory items for this work order
    const inventoryItems = await getInventoryItemsForWorkOrder(id);

    return mapFromDbWorkOrder(data, timeEntries, inventoryItems);
  } catch (error) {
    console.error(`Error in getWorkOrderById (${id}):`, error);
    throw error;
  }
}

/**
 * Update a work order
 */
export async function updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
  try {
    // Get current work order to detect status changes
    const currentWorkOrder = await getWorkOrderById(id);
    const oldStatus = currentWorkOrder.status;
    
    // Map properties to match database column names
    const workOrderData = {
      customer: updates.customer,
      description: updates.description,
      status: updates.status,
      priority: updates.priority,
      technician: updates.technician,
      technician_id: updates.technician_id,
      location: updates.location,
      due_date: updates.dueDate,
      notes: updates.notes,
      updated_at: new Date().toISOString(), // Update the last updated timestamp
    };

    const { error } = await supabase
      .from('work_orders')
      .update(workOrderData)
      .eq('id', id);

    if (error) throw new Error(`Failed to update work order: ${error.message}`);

    // Update inventory items if provided
    if (updates.inventoryItems) {
      // First remove all existing items
      await removeInventoryItemsFromWorkOrder(id);
      // Then add the updated items
      await addInventoryItemsToWorkOrder(id, updates.inventoryItems);
    }

    const updatedWorkOrder = await getWorkOrderById(id);
    
    // Trigger workflow on status change
    if (updates.status && updates.status !== oldStatus) {
      triggerWorkflowOnWorkOrderStatusUpdate(updatedWorkOrder, oldStatus).catch(err => 
        console.error('Workflow trigger failed:', err)
      );
      
      // Check if completed
      if (updates.status === 'completed') {
        triggerWorkflowOnWorkOrderComplete(updatedWorkOrder).catch(err => 
          console.error('Workflow trigger failed:', err)
        );
      }
    }
    
    return updatedWorkOrder;
  } catch (error) {
    console.error('Error in updateWorkOrder:', error);
    throw error;
  }
}

/**
 * Delete a work order
 */
export async function deleteWorkOrder(id: string): Promise<boolean> {
  try {
    // First delete related time entries
    await supabase
      .from('work_order_time_entries')
      .delete()
      .eq('work_order_id', id);

    // Delete related inventory items
    await supabase
      .from('work_order_inventory_items')
      .delete()
      .eq('work_order_id', id);

    // Now delete the work order itself
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete work order: ${error.message}`);

    return true;
  } catch (error) {
    console.error('Error in deleteWorkOrder:', error);
    return false;
  }
}

/**
 * Helper function to get time entries for a work order
 */
async function getTimeEntriesForWorkOrder(workOrderId: string): Promise<TimeEntry[]> {
  try {
    const { data, error } = await supabase
      .from('work_order_time_entries')
      .select('*')
      .eq('work_order_id', workOrderId);

    if (error) throw new Error(`Failed to fetch time entries: ${error.message}`);

    return data.map(mapTimeEntryFromDb);
  } catch (error) {
    console.error(`Error getting time entries for work order ${workOrderId}:`, error);
    return [];
  }
}

/**
 * Helper function to get inventory items for a work order
 */
async function getInventoryItemsForWorkOrder(workOrderId: string): Promise<WorkOrderInventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('work_order_inventory_items')
      .select('*')
      .eq('work_order_id', workOrderId);

    if (error) throw new Error(`Failed to fetch inventory items: ${error.message}`);

    return data.map((item) => {
      const mappedItem = mapInventoryItemFromDb(item);
      // Ensure total is calculated correctly
      mappedItem.total = item.quantity * item.unit_price;
      return mappedItem;
    });
  } catch (error) {
    console.error(`Error getting inventory items for work order ${workOrderId}:`, error);
    return [];
  }
}

/**
 * Add inventory items to a work order
 */
async function addInventoryItemsToWorkOrder(workOrderId: string, items: WorkOrderInventoryItem[]): Promise<void> {
  try {
    const inventoryItems = items.map(item => ({
      work_order_id: workOrderId,
      inventory_item_id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    const { error } = await supabase
      .from('work_order_inventory_items')
      .insert(inventoryItems);

    if (error) throw new Error(`Failed to add inventory items: ${error.message}`);
  } catch (error) {
    console.error(`Error adding inventory items to work order ${workOrderId}:`, error);
    throw error;
  }
}

/**
 * Remove all inventory items from a work order
 */
async function removeInventoryItemsFromWorkOrder(workOrderId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('work_order_inventory_items')
      .delete()
      .eq('work_order_id', workOrderId);

    if (error) throw new Error(`Failed to remove inventory items: ${error.message}`);
  } catch (error) {
    console.error(`Error removing inventory items from work order ${workOrderId}:`, error);
    throw error;
  }
}
