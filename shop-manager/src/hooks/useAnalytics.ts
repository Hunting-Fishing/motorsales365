import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsData } from '@/types/analytics';
import { subDays, format } from 'date-fns';

export function useAnalytics(timeRange: string) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      console.log("Fetching analytics data for range:", timeRange);
      
      // Calculate date range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = subDays(new Date(), days);

      // Fetch work orders for revenue and order analytics
      const { data: workOrders, error: workOrderError } = await supabase
        .from('work_orders')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (workOrderError) throw workOrderError;

      // Fetch customers
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (customerError) throw customerError;

      // Process analytics data
      const completedOrders = workOrders?.filter(wo => wo.status === 'completed') || [];
      const totalRevenue = completedOrders.reduce((sum, wo) => sum + (wo.total_cost || 0), 0);
      const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Generate revenue trend data
      const revenueData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, 'MMM dd');
        const dayRevenue = completedOrders
          .filter(wo => format(new Date(wo.created_at), 'MMM dd') === dateKey)
          .reduce((sum, wo) => sum + (wo.total_cost || 0), 0);
        
        revenueData.push({
          date: dateKey,
          revenue: dayRevenue
        });
      }

      // Work order status distribution
      const statusCounts = workOrders?.reduce((acc: any, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const workOrderData = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.charAt(0).toUpperCase() + status.slice(1),
        count: count as number
      }));

      // Customer segments (simplified)
      const customerData = [
        { name: 'New', value: customers?.filter(c => 
          new Date(c.created_at) > subDays(new Date(), 30)
        ).length || 0 },
        { name: 'Returning', value: customers?.filter(c => 
          new Date(c.created_at) <= subDays(new Date(), 30)
        ).length || 0 }
      ];

      const analyticsData: AnalyticsData = {
        overview: {
          totalRevenue,
          totalWorkOrders: workOrders?.length || 0,
          activeCustomers: customers?.length || 0,
          avgOrderValue,
          revenueChange: 0, // Would need historical data to calculate
          workOrderChange: 0,
          customerChange: 0,
          avgOrderChange: 0
        },
        revenue: revenueData,
        workOrders: workOrderData,
        customers: customerData,
        performance: null // Will be populated from performance_metrics table later
      };

      setAnalytics(analyticsData);
      setError(null);
      console.log("Analytics data loaded successfully");
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics
  };
}