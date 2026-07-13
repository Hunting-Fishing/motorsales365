import { supabase } from "@/integrations/supabase/client";
import { Order, OrderItem, CreateOrderRequest, UpdateOrderRequest } from "@/types/order";
import { taxSettingsService } from "@/services/settings/taxSettingsService";

/**
 * Create a new order from cart items with enhanced calculations
 */
export const createOrder = async (request: CreateOrderRequest): Promise<Order> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Check inventory availability before creating order
  const inventoryCheck = await checkInventoryAvailability(request.items);
  if (!inventoryCheck) {
    throw new Error("Some items are out of stock");
  }

  // Calculate amounts
  const subtotal = request.items.reduce((sum, item) => 
    sum + (item.unit_price * item.quantity), 0
  );
  
  // Get shop ID and tax settings
  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();
    
  let taxAmount = 0;
  if (profile?.shop_id) {
    try {
      const taxSettings = await taxSettingsService.getTaxSettings(profile.shop_id);
      taxAmount = subtotal * (taxSettings.parts_tax_rate / 100);
    } catch (error) {
      console.error('Failed to get tax settings, using default:', error);
      taxAmount = subtotal * 0.08; // Fallback to 8%
    }
  } else {
    taxAmount = subtotal * 0.08; // Fallback to 8%
  }
  
  const shippingAmount = calculateShippingCost(request.shipping_method);
  const totalAmount = subtotal + taxAmount + shippingAmount;

  // Create order with enhanced fields
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      subtotal_amount: subtotal,
      tax_amount: taxAmount,
      shipping_amount: shippingAmount,
      discount_amount: 0,
      total_amount: totalAmount,
      shipping_address_id: request.shipping_address_id,
      billing_address_id: request.billing_address_id,
      shipping_method: request.shipping_method,
      notes: request.notes,
      status: "pending",
      payment_status: "unpaid"
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Get product details and create order items
  const orderItems = await Promise.all(request.items.map(async (item) => {
    // Fetch product details (using available columns)
    const { data: product } = await supabase
      .from('products')
      .select('title, image_url, id')
      .eq('id', item.product_id)
      .maybeSingle();

    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      product_name: product?.title || 'Unknown Product',
      product_image_url: product?.image_url,
      product_sku: product?.id || ''
    };
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return order as any;
};

/**
 * Calculate shipping cost based on method
 */
const calculateShippingCost = (method?: string): number => {
  switch (method) {
    case 'express': return 15.00;
    case 'overnight': return 25.00;
    case 'standard':
    default: return 0.00;
  }
};

/**
 * Check inventory availability for order items
 */
export const checkInventoryAvailability = async (items: CreateOrderRequest['items']): Promise<boolean> => {
  for (const item of items) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('quantity')
      .eq('id', item.product_id)
      .maybeSingle();

    if (error) {
      console.warn(`Could not check inventory for product ${item.product_id}:`, error);
      continue; // Continue with order if inventory check fails
    }
    
    if (data && data.quantity < item.quantity) {
      return false;
    }
  }
  return true;
};

/**
 * Get user's orders with items
 */
export const getUserOrders = async (): Promise<Order[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        product:products(
          id,
          title,
          image_url,
          sku
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as any;
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        product:products(
          id,
          title,
          image_url,
          sku
        )
      )
    `)
    .eq("id", orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as any;
};

/**
 * Update order status
 */
export const updateOrder = async (orderId: string, updates: UpdateOrderRequest): Promise<Order> => {
  const { data, error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data as any;
};

/**
 * Get all orders (admin)
 */
export const getAllOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(
        *,
        product:products(
          id,
          title,
          image_url,
          sku
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as any;
};

/**
 * Cancel order
 */
export const cancelOrder = async (orderId: string): Promise<Order> => {
  return updateOrder(orderId, { 
    status: "cancelled",
    payment_status: "refunded" 
  });
};