import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyWorkOrder {
  id: string;
  work_order_number: string;
  description: string;
  status: string;
  priority: string;
  customer_name: string;
  technician_name?: string;
  start_time?: string;
  end_time?: string;
  estimated_hours?: number;
  days_overdue?: number;
  is_carry_over: boolean;
  created_at: string;
}

interface DailyStats {
  today: DailyWorkOrder[];
  overdue: DailyWorkOrder[];
  carryOvers: DailyWorkOrder[];
  totalToday: number;
  totalOverdue: number;
  totalCarryOvers: number;
  completedToday: number;
}

export function useDailyWorkOrders() {
  const [dailyData, setDailyData] = useState<DailyStats>({
    today: [],
    overdue: [],
    carryOvers: [],
    totalToday: 0,
    totalOverdue: 0,
    totalCarryOvers: 0,
    completedToday: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDailyData();
  }, []);

  const fetchDailyData = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      // Fetch today's work orders
      const { data: todayWOs, error: todayError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers(first_name, last_name),
          profiles!fk_work_orders_technician(first_name, last_name)
        `)
        .gte('start_time', today)
        .lt('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: true });

      if (todayError) throw todayError;

      // Fetch overdue work orders
      const { data: overdueWOs, error: overdueError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers(first_name, last_name),
          profiles!fk_work_orders_technician(first_name, last_name)
        `)
        .lt('end_time', now)
        .neq('status', 'completed')
        .order('end_time', { ascending: true });

      if (overdueError) throw overdueError;

      // Fetch carry-over work orders (created before today, still active)
      const { data: carryOverWOs, error: carryOverError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customers(first_name, last_name),
          profiles!fk_work_orders_technician(first_name, last_name)
        `)
        .lt('created_at', today)
        .in('status', ['pending', 'in_progress', 'assigned'])
        .order('created_at', { ascending: true });

      if (carryOverError) throw carryOverError;

      // Transform data
      const transformWorkOrder = (wo: any, isCarryOver = false): DailyWorkOrder => {
        const customerName = wo.customers 
          ? `${wo.customers.first_name} ${wo.customers.last_name}`.trim()
          : 'Unknown Customer';
        
        const technicianName = wo.profiles 
          ? `${wo.profiles.first_name} ${wo.profiles.last_name}`.trim()
          : undefined;
        
        let daysOverdue = 0;
        if (wo.end_time && wo.status !== 'completed') {
          const endDate = new Date(wo.end_time);
          const todayDate = new Date();
          daysOverdue = Math.floor((todayDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: wo.id,
          work_order_number: wo.work_order_number || `WO-${wo.id.slice(0, 8)}`,
          description: wo.description || 'No description',
          status: wo.status,
          priority: wo.priority || 'medium',
          customer_name: customerName,
          technician_name: technicianName,
          start_time: wo.start_time,
          end_time: wo.end_time,
          estimated_hours: wo.estimated_hours,
          days_overdue: daysOverdue > 0 ? daysOverdue : undefined,
          is_carry_over: isCarryOver,
          created_at: wo.created_at
        };
      };

      const todayTransformed = (todayWOs || []).map(wo => transformWorkOrder(wo));
      const overdueTransformed = (overdueWOs || []).map(wo => transformWorkOrder(wo));
      const carryOverTransformed = (carryOverWOs || []).map(wo => transformWorkOrder(wo, true));

      // Calculate completed today
      const { count: completedTodayCount, error: completedError } = await supabase
        .from('work_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', today);

      if (completedError) throw completedError;

      const newDailyData: DailyStats = {
        today: todayTransformed,
        overdue: overdueTransformed,
        carryOvers: carryOverTransformed,
        totalToday: todayTransformed.length,
        totalOverdue: overdueTransformed.length,
        totalCarryOvers: carryOverTransformed.length,
        completedToday: completedTodayCount || 0
      };

      setDailyData(newDailyData);
      setError(null);
    } catch (err) {
      console.error('Error fetching daily work orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch daily data');
    } finally {
      setLoading(false);
    }
  };

  return {
    dailyData,
    loading,
    error,
    refetch: fetchDailyData
  };
}