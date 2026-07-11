import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useWorkOrdersCount() {
  const [activeCount, setActiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('work_orders_count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'work_orders'
      }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCounts = async () => {
    try {
      // Get total count
      const { count: total } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true });

      // Get active count (not completed)
      const { count: active } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');

      setTotalCount(total || 0);
      setActiveCount(active || 0);
    } catch (error) {
      console.error('Failed to fetch work order counts:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    activeCount,
    totalCount,
    loading,
    refresh: fetchCounts
  };
}