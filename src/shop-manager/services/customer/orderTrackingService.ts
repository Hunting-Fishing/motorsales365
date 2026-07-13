import { supabase } from "@/integrations/supabase/client";

export interface OrderTracking {
  id: string;
  order_id: string;
  status: string;
  location?: string;
  estimated_delivery?: string;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderTrackingUpdate {
  status: string;
  location?: string;
  estimated_delivery?: string;
  tracking_number?: string;
  carrier?: string;
  notes?: string;
}

export const orderTrackingService = {
  // Get tracking information for an order
  async getOrderTracking(orderId: string): Promise<OrderTracking[]> {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data?.map(item => ({
      id: item.id,
      order_id: item.order_id,
      status: item.new_status,
      location: item.notes,
      estimated_delivery: null,
      tracking_number: null,
      carrier: null,
      notes: item.notes,
      created_at: item.changed_at,
      updated_at: item.changed_at
    })) || [];
  },

  // Add tracking update
  async addTrackingUpdate(orderId: string, update: OrderTrackingUpdate): Promise<OrderTracking> {
    const { data, error } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderId,
        new_status: update.status,
        notes: update.notes || update.location,
        changed_by: 'system'
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      order_id: data.order_id,
      status: data.new_status,
      location: data.notes,
      estimated_delivery: null,
      tracking_number: null,
      carrier: null,
      notes: data.notes,
      created_at: data.changed_at,
      updated_at: data.changed_at
    };
  },

  // Update tracking information
  async updateTracking(trackingId: string, update: Partial<OrderTrackingUpdate>): Promise<OrderTracking> {
    const updateData: any = {};
    if (update.status) updateData.new_status = update.status;
    if (update.notes || update.location) updateData.notes = update.notes || update.location;

    const { data, error } = await supabase
      .from('order_status_history')
      .update(updateData)
      .eq('id', trackingId)
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      order_id: data.order_id,
      status: data.new_status,
      location: data.notes,
      estimated_delivery: null,
      tracking_number: null,
      carrier: null,
      notes: data.notes,
      created_at: data.changed_at,
      updated_at: data.changed_at
    };
  },

  // Subscribe to tracking updates
  subscribeToTrackingUpdates(orderId: string, callback: (tracking: OrderTracking) => void) {
    return supabase
      .channel(`order_tracking_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any;
            const mapped = {
              id: newData.id,
              order_id: newData.order_id,
              status: newData.new_status,
              location: newData.notes,
              estimated_delivery: null,
              tracking_number: null,
              carrier: null,
              notes: newData.notes,
              created_at: newData.changed_at,
              updated_at: newData.changed_at
            };
            callback(mapped as OrderTracking);
          }
        }
      )
      .subscribe();
  }
};