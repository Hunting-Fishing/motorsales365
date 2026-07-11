import { supabase } from '@/integrations/supabase/client';

// Type workaround to prevent infinite recursion
const db = supabase as any;

export const cartService = {
  // Get or create cart for user
  async getOrCreateCart(userId: string) {
    // First try to get existing cart
    const { data: existingCart } = await db
      .from('shopping_carts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single() as any;

    if (existingCart) {
      return existingCart;
    }

    // Create new cart
    const { data: newCart, error } = await db
      .from('shopping_carts')
      .insert({
        user_id: userId,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return newCart;
  },

  // Get cart items with product details
  async getCartItems(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    
    const { data, error } = await db
      .from('cart_items')
      .select(`
        *,
        product:products(
          id,
          name,
          title,
          price,
          image_url,
          stock_quantity,
          is_available
        )
      `)
      .eq('cart_id', cart.id);

    if (error) throw error;
    return data || [];
  },

  // Add item to cart
  async addToCart(userId: string, productId: string, quantity: number = 1) {
    const cart = await this.getOrCreateCart(userId);

    // Check if item already exists in cart
    const { data: existingItem } = await db
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .single();

    if (existingItem) {
      // Update quantity
      const { data, error } = await db
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Add new item
      const { data, error } = await db
        .from('cart_items')
        .insert({
          cart_id: cart.id,
          product_id: productId,
          quantity
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Update cart item quantity
  async updateCartItemQuantity(cartItemId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeFromCart(cartItemId);
    }

    const { data, error } = await db
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remove item from cart
  async removeFromCart(cartItemId: string) {
    const { error } = await db
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) throw error;
  },

  // Clear entire cart
  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    
    const { error } = await db
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error) throw error;
  },

  // Get cart total
  async getCartTotal(userId: string) {
    const items = await this.getCartItems(userId);
    
    const subtotal = items.reduce((total: number, item: any) => {
      const price = item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);

    const itemCount = items.reduce((count: number, item: any) => count + item.quantity, 0);

    return { subtotal, itemCount, items };
  },

  // Check if items in cart are still available
  async validateCartItems(userId: string) {
    const items = await this.getCartItems(userId);
    const issues: Array<{
      itemId: string;
      productId: string;
      issue: 'out_of_stock' | 'insufficient_stock' | 'unavailable';
      available?: number;
    }> = [];

    for (const item of items) {
      if (!item.product) continue;

      if (!item.product.is_available) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          issue: 'unavailable'
        });
      } else if (item.product.stock_quantity <= 0) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          issue: 'out_of_stock'
        });
      } else if (item.product.stock_quantity < item.quantity) {
        issues.push({
          itemId: item.id,
          productId: item.product.id,
          issue: 'insufficient_stock',
          available: item.product.stock_quantity
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  },

  // Convert cart to order (used during checkout)
  async convertCartToOrder(userId: string, orderData: {
    shipping_address?: any;
    billing_address?: any;
    payment_method?: string;
  }) {
    const { subtotal, items } = await this.getCartTotal(userId);
    
    if (items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Validate cart items
    const validation = await this.validateCartItems(userId);
    if (!validation.valid) {
      throw new Error('Some items in your cart are no longer available');
    }

    // Create order
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: subtotal,
        status: 'pending',
        order_number: `ORD-${Date.now()}`,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        payment_method: orderData.payment_method
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    for (const item of items) {
      if (!item.product) continue;

      await db
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_image_url: item.product.image_url,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        });
    }

    // Clear cart
    await this.clearCart(userId);

    return order.id;
  }
};