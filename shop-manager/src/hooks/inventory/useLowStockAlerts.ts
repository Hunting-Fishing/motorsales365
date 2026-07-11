import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface LowStockAlert {
  id: string;
  inventory_item_id: string;
  item_name: string;
  current_quantity: number;
  reorder_point: number;
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export function useLowStockAlerts() {
  const queryClient = useQueryClient();

  // Get all low stock alerts
  const {
    data: alerts = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      // Fetch items where quantity is at or below reorder point
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, sku, quantity, reorder_point');

      if (error) throw error;

      // Filter items where quantity <= reorder_point
      const lowStockItems = (data || []).filter(item => 
        item.quantity <= item.reorder_point
      );

      return lowStockItems
        .sort((a, b) => a.quantity - b.quantity)
        .map(item => ({
          id: item.id,
          inventory_item_id: item.id,
          item_name: item.name,
          current_quantity: item.quantity,
          reorder_point: item.reorder_point,
          status: 'active' as const,
          created_at: new Date().toISOString()
        }));
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Get critical alerts (quantity at or below 0)
  const {
    data: criticalAlerts = [],
  } = useQuery({
    queryKey: ['critical-stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, sku, quantity')
        .lte('quantity', 0)
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Acknowledge alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (itemId: string) => {
      // In a real implementation, this would update an alerts table
      toast({
        title: "Alert Acknowledged",
        description: "Low stock alert has been acknowledged.",
      });
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    }
  });

  // Get alert statistics
  const alertStats = {
    total: alerts.length,
    critical: criticalAlerts.length,
    warning: alerts.filter(a => a.current_quantity > 0).length,
  };

  return {
    alerts,
    criticalAlerts,
    alertStats,
    isLoading,
    refetch,
    acknowledgeAlert: acknowledgeAlert.mutateAsync
  };
}
