import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  reorder_point: number;
  unit_of_measure: string;
  category: string;
}

export function usePowerWashingLowStock() {
  const { user } = useAuth();

  const { data: lowStockItems = [], isLoading } = useQuery({
    queryKey: ['power-washing-low-stock', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.shop_id) return [];

      const { data, error } = await supabase
        .from('power_washing_inventory')
        .select('id, name, quantity, reorder_point, unit_of_measure, category')
        .eq('shop_id', profile.shop_id)
        .order('quantity', { ascending: true });

      if (error) throw error;
      
      return (data || [])
        .filter(item => (item.quantity || 0) <= (item.reorder_point || 0))
        .slice(0, 10) as LowStockItem[];
    },
    enabled: !!user?.id,
  });

  return {
    lowStockItems,
    lowStockCount: lowStockItems.length,
    isLoading,
  };
}
