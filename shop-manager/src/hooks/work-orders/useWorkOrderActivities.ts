import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WorkOrderActivity {
  id: string;
  action: string;
  work_order_id: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  details?: any;
  work_order?: {
    work_order_number?: string;
    description?: string;
    customer?: {
      first_name?: string;
      last_name?: string;
    };
  };
}

export function useWorkOrderActivities(limit = 20) {
  const [activities, setActivities] = useState<WorkOrderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('work_order_activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_activities'
        },
        (payload) => {
          const newActivity = payload.new as WorkOrderActivity;
          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('work_order_activities')
        .select(`
          *,
          work_orders!inner(
            work_order_number,
            description,
            customers(
              first_name,
              last_name
            )
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setActivities(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching work order activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities
  };
}