import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface AnalyticsData {
  period: string;
  completed: number;
  created: number;
  revenue: number;
  avgCompletionTime: number;
}

interface AnalyticsStats {
  data: AnalyticsData[];
  totalRevenue: number;
  totalCompleted: number;
  totalCreated: number;
  averageValue: number;
  periodComparison: {
    revenue: number;
    completed: number;
    created: number;
  };
}

export function useWorkOrderAnalytics(period: TimePeriod = 'month', customRange?: { start: string; end: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsStats>({
    data: [],
    totalRevenue: 0,
    totalCompleted: 0,
    totalCreated: 0,
    averageValue: 0,
    periodComparison: {
      revenue: 0,
      completed: 0,
      created: 0
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period, customRange]);

  const getDateRange = () => {
    if (customRange) {
      return { start: customRange.start, end: customRange.end };
    }

    const now = new Date();
    let start: Date;
    
    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'week':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 56);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear() - 2, 0, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear() - 5, 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Fetch work orders for the period
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });

      if (woError) throw woError;

      // Process data by time period
      const groupedData = groupDataByPeriod(workOrders || [], period);
      
      // Calculate totals
      const totalRevenue = (workOrders || []).reduce((sum, wo) => sum + (Number(wo.total_cost) || 0), 0);
      const totalCompleted = (workOrders || []).filter(wo => wo.status === 'completed').length;
      const totalCreated = (workOrders || []).length;
      const averageValue = totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

      // Calculate period comparison (previous period)
      const prevStart = getPreviousPeriodStart(start, period);
      const { data: prevWorkOrders, error: prevError } = await supabase
        .from('work_orders')
        .select('*')
        .gte('created_at', prevStart)
        .lt('created_at', start);

      if (prevError) throw prevError;

      const prevRevenue = (prevWorkOrders || []).reduce((sum, wo) => sum + (Number(wo.total_cost) || 0), 0);
      const prevCompleted = (prevWorkOrders || []).filter(wo => wo.status === 'completed').length;
      const prevCreated = (prevWorkOrders || []).length;

      const newAnalytics: AnalyticsStats = {
        data: groupedData,
        totalRevenue,
        totalCompleted,
        totalCreated,
        averageValue,
        periodComparison: {
          revenue: prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0,
          completed: prevCompleted > 0 ? ((totalCompleted - prevCompleted) / prevCompleted) * 100 : 0,
          created: prevCreated > 0 ? ((totalCreated - prevCreated) / prevCreated) * 100 : 0
        }
      };

      setAnalytics(newAnalytics);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const groupDataByPeriod = (workOrders: any[], timePeriod: TimePeriod): AnalyticsData[] => {
    const grouped = new Map<string, { completed: any[], created: any[], revenue: number }>();

    workOrders.forEach(wo => {
      const date = new Date(wo.created_at);
      let key: string;

      switch (timePeriod) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { completed: [], created: [], revenue: 0 });
      }

      const group = grouped.get(key)!;
      group.created.push(wo);
      group.revenue += Number(wo.total_cost) || 0;
      
      if (wo.status === 'completed') {
        group.completed.push(wo);
      }
    });

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      completed: data.completed.length,
      created: data.created.length,
      revenue: data.revenue,
      avgCompletionTime: calculateAvgCompletionTime(data.completed)
    })).sort((a, b) => a.period.localeCompare(b.period));
  };

  const calculateAvgCompletionTime = (completedOrders: any[]): number => {
    if (completedOrders.length === 0) return 0;
    
    const completionTimes = completedOrders
      .filter(wo => wo.start_time && wo.updated_at)
      .map(wo => {
        const start = new Date(wo.start_time);
        const end = new Date(wo.updated_at);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
      });

    return completionTimes.length > 0 
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length 
      : 0;
  };

  const getPreviousPeriodStart = (currentStart: string, timePeriod: TimePeriod): string => {
    const start = new Date(currentStart);
    
    switch (timePeriod) {
      case 'day':
        start.setDate(start.getDate() - 7);
        break;
      case 'week':
        start.setDate(start.getDate() - 56);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 12);
        break;
      case 'quarter':
        start.setFullYear(start.getFullYear() - 2);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 5);
        break;
    }

    return start.toISOString().split('T')[0];
  };

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
}