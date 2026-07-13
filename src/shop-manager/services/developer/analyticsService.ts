import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalWorkOrders: number;
  completedWorkOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

class AnalyticsService {
  async getOverviewData(): Promise<AnalyticsData> {
    try {
      // Get user counts
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');

      // Get work order data
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('id, status, total_cost');

      // Calculate metrics
      const totalUsers = profiles?.length || 0;
      const activeUsers = profiles?.length || 0; // Assuming all users are active
      const totalWorkOrders = workOrders?.length || 0;
      const completedWorkOrders = workOrders?.filter(wo => wo.status === 'completed').length || 0;
      const totalRevenue = workOrders?.reduce((sum, wo) => sum + (wo.total_cost || 0), 0) || 0;
      const averageOrderValue = totalWorkOrders > 0 ? totalRevenue / totalWorkOrders : 0;

      return {
        totalUsers,
        activeUsers,
        totalWorkOrders,
        completedWorkOrders,
        totalRevenue,
        averageOrderValue,
      };
    } catch (error) {
      console.error('Error fetching overview data:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalWorkOrders: 0,
        completedWorkOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      };
    }
  }

  async getWorkOrderTrends(): Promise<ChartData[]> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by date
      const grouped = data?.reduce((acc, wo) => {
        const date = new Date(wo.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return Object.entries(grouped).map(([date, value]) => ({
        name: date,
        value,
        date,
      }));
    } catch (error) {
      console.error('Error fetching work order trends:', error);
      return [];
    }
  }

  async getRevenueTrends(): Promise<ChartData[]> {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('created_at, total_cost')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      // Group by date and sum revenue
      const grouped = data?.reduce((acc, wo) => {
        const date = new Date(wo.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + (wo.total_cost || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      return Object.entries(grouped).map(([date, value]) => ({
        name: date,
        value,
        date,
      }));
    } catch (error) {
      console.error('Error fetching revenue trends:', error);
      return [];
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetric[]> {
    try {
      const { data, error } = await supabase
        .from('system_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map(metric => ({
        name: metric.metric_name,
        value: metric.metric_value,
        unit: metric.metric_unit || '%',
        trend: metric.metric_value > 50 ? 'up' : 'down',
        change: Math.random() * 10 - 5, // Mock change percentage
      })) || [];
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return [];
    }
  }

  async getUserActivityData(): Promise<ChartData[]> {
    try {
      // Get real user data from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, created_at');
      
      const totalUsers = profiles?.length || 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newUsers = profiles?.filter(p => 
        new Date(p.created_at) > thirtyDaysAgo
      ).length || 0;
      
      return [
        { name: 'Active Users', value: totalUsers },
        { name: 'New Users', value: newUsers },
        { name: 'Returning Users', value: Math.max(0, totalUsers - newUsers) },
      ];
    } catch (error) {
      console.error('Error fetching user activity data:', error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();