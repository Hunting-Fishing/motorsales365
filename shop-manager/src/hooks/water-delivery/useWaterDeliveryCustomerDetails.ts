import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WaterDeliveryCustomerStats {
  totalOrders: number;
  totalRevenue: number;
  balanceDue: number;
  totalGallons: number;
  lastDelivery: string | null;
  nextDelivery: string | null;
  locationsCount: number;
  tanksCount: number;
  quotesCount: number;
  invoicesCount: number;
  aging30: number;
  aging60: number;
  aging90: number;
}

export function useWaterDeliveryCustomerDetails(customerId: string) {
  const customerQuery = useQuery({
    queryKey: ['water-delivery-customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from('water_delivery_customers')
        .select('*')
        .eq('id', customerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });

  const statsQuery = useQuery({
    queryKey: ['water-delivery-customer-stats', customerId],
    queryFn: async (): Promise<WaterDeliveryCustomerStats> => {
      if (!customerId) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          balanceDue: 0,
          totalGallons: 0,
          lastDelivery: null,
          nextDelivery: null,
          locationsCount: 0,
          tanksCount: 0,
          quotesCount: 0,
          invoicesCount: 0,
          aging30: 0,
          aging60: 0,
          aging90: 0,
        };
      }

      // Fetch all related data in parallel
      const [ordersRes, locationsRes, tanksRes, quotesRes, invoicesRes] = await Promise.all([
        supabase
          .from('water_delivery_orders')
          .select('id, total_amount, quantity_gallons, status, order_date')
          .eq('customer_id', customerId),
        supabase
          .from('water_delivery_locations')
          .select('id')
          .eq('customer_id', customerId),
        supabase
          .from('water_delivery_tanks')
          .select('id')
          .eq('customer_id', customerId),
        supabase
          .from('water_delivery_quotes')
          .select('id')
          .eq('customer_id', customerId),
        supabase
          .from('water_delivery_invoices')
          .select('id, total_amount, balance_due, status, due_date')
          .eq('customer_id', customerId),
      ]);

      const orders = ordersRes.data || [];
      const locations = locationsRes.data || [];
      const tanks = tanksRes.data || [];
      const quotes = quotesRes.data || [];
      const invoices = invoicesRes.data || [];

      // Calculate stats
      const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalGallons = completedOrders.reduce((sum, o) => sum + (o.quantity_gallons || 0), 0);

      // Find last and next delivery
      const now = new Date();
      const pastOrders = orders
        .filter(o => o.order_date && new Date(o.order_date) < now && (o.status === 'completed' || o.status === 'delivered'))
        .sort((a, b) => new Date(b.order_date || 0).getTime() - new Date(a.order_date || 0).getTime());
      const futureOrders = orders
        .filter(o => o.order_date && new Date(o.order_date) >= now && o.status !== 'cancelled')
        .sort((a, b) => new Date(a.order_date || 0).getTime() - new Date(b.order_date || 0).getTime());

      // Calculate aging
      const today = new Date();
      let aging30 = 0, aging60 = 0, aging90 = 0;
      invoices.forEach(inv => {
        if (inv.balance_due > 0 && inv.due_date) {
          const dueDate = new Date(inv.due_date);
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 90) {
            aging90 += inv.balance_due;
          } else if (daysOverdue > 60) {
            aging60 += inv.balance_due;
          } else if (daysOverdue > 30) {
            aging30 += inv.balance_due;
          }
        }
      });

      const balanceDue = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

      return {
        totalOrders: orders.length,
        totalRevenue,
        balanceDue,
        totalGallons,
        lastDelivery: pastOrders[0]?.order_date || null,
        nextDelivery: futureOrders[0]?.order_date || null,
        locationsCount: locations.length,
        tanksCount: tanks.length,
        quotesCount: quotes.length,
        invoicesCount: invoices.length,
        aging30,
        aging60,
        aging90,
      };
    },
    enabled: !!customerId,
  });

  return {
    customer: customerQuery.data,
    stats: statsQuery.data || {
      totalOrders: 0,
      totalRevenue: 0,
      balanceDue: 0,
      totalGallons: 0,
      lastDelivery: null,
      nextDelivery: null,
      locationsCount: 0,
      tanksCount: 0,
      quotesCount: 0,
      invoicesCount: 0,
      aging30: 0,
      aging60: 0,
      aging90: 0,
    },
    isLoading: customerQuery.isLoading || statsQuery.isLoading,
    error: customerQuery.error?.message || statsQuery.error?.message || null,
    refetch: () => {
      customerQuery.refetch();
      statsQuery.refetch();
    },
  };
}
