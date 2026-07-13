import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export const orderService = {
  // Get user orders
  async getUserOrders(userId: string) {
    const { data, error } = await db
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:products(id, name, title, image_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single order
  async getOrder(orderId: string) {
    const { data, error } = await db.rpc('get_order_with_items', {
      order_id_param: orderId
    });

    if (error) throw error;
    return data;
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    const { error } = await db.rpc('update_order_status', {
      order_id_param: orderId,
      new_status: status,
      notes_param: notes
    });

    if (error) throw error;
  },

  // Cancel order
  async cancelOrder(orderId: string, reason?: string) {
    await this.updateOrderStatus(orderId, 'cancelled', reason);
  }
};