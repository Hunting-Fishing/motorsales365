
import { supabase } from '@/lib/supabase';
import { InventoryOrder, CreateInventoryOrderDto, UpdateInventoryOrderDto, ReceiveInventoryOrderDto } from '@/types/inventory/orders';

// Define the valid status type
type InventoryOrderStatus = 'ordered' | 'partially received' | 'received' | 'cancelled';

// Fetch all inventory orders
export async function getAllInventoryOrders(): Promise<InventoryOrder[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_orders')
      .select(`
        *,
        inventory_items:item_id (name)
      `)
      .order('order_date', { ascending: false });

    if (error) throw error;

    // Transform data to include item_name from the join and ensure proper typing
    return data.map(order => ({
      ...order,
      item_name: order.inventory_items?.name || 'Unknown Item',
      status: order.status as InventoryOrderStatus,
    })) as InventoryOrder[];
  } catch (error) {
    console.error('Error fetching inventory orders:', error);
    throw error;
  }
}

// Create new inventory order
export async function createInventoryOrder(orderData: CreateInventoryOrderDto): Promise<InventoryOrder> {
  try {
    const { data, error } = await supabase
      .from('inventory_orders')
      .insert(orderData)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      status: data.status as InventoryOrderStatus
    } as InventoryOrder;
  } catch (error) {
    console.error('Error creating inventory order:', error);
    throw error;
  }
}

// Receive inventory (partial or full)
export async function receiveInventoryOrder(receiveData: ReceiveInventoryOrderDto): Promise<void> {
  try {
    const { data, error } = await supabase
      .rpc('receive_inventory_order', {
        order_id: receiveData.order_id,
        quantity_to_receive: receiveData.quantity_to_receive
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error receiving inventory:', error);
    throw error;
  }
}

// Cancel an inventory order
export async function cancelInventoryOrder(orderId: string): Promise<InventoryOrder> {
  try {
    const { data, error } = await supabase
      .from('inventory_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      status: data.status as InventoryOrderStatus
    } as InventoryOrder;
  } catch (error) {
    console.error('Error cancelling inventory order:', error);
    throw error;
  }
}

// Update an inventory order
export async function updateInventoryOrder(
  orderId: string, 
  updateData: UpdateInventoryOrderDto
): Promise<InventoryOrder> {
  try {
    const { data, error } = await supabase
      .from('inventory_orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      status: data.status as InventoryOrderStatus
    } as InventoryOrder;
  } catch (error) {
    console.error('Error updating inventory order:', error);
    throw error;
  }
}
