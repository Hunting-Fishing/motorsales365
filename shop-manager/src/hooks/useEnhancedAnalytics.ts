import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ComparisonPeriod {
  name: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface ComparisonData {
  periods: ComparisonPeriod[];
  growth: {
    revenue: number;
    orders: number;
    customers: number;
  };
}

interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface RevenueTrend {
  date: string;
  value: number;
  orders: number;
}

interface TopCustomer {
  name: string;
  revenue: number;
  orders: number;
}

interface DrillDownData {
  revenue: {
    breakdown: RevenueBreakdown[];
    trends: RevenueTrend[];
    topCustomers: TopCustomer[];
  };
}

interface KpiMetric {
  name: string;
  current: number;
  target: number;
  status: 'on-track' | 'warning' | 'behind';
}

interface KpiData {
  metrics: KpiMetric[];
}

export function useEnhancedAnalytics(timeRange: string) {
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [isLoadingEnhanced, setIsLoadingEnhanced] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDateRanges = (range: string) => {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (range) {
      case '7d':
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { currentStart, currentEnd: now, previousStart, previousEnd };
  };

  const fetchEnhancedAnalytics = async () => {
    try {
      setIsLoadingEnhanced(true);
      setError(null);

      const { currentStart, currentEnd, previousStart, previousEnd } = getDateRanges(timeRange);

      // Fetch current period work orders
      const { data: currentOrders, error: currentError } = await supabase
        .from('work_orders')
        .select('id, total_cost, customer_id, created_at, service_type')
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString());

      if (currentError) throw currentError;

      // Fetch previous period work orders
      const { data: previousOrders, error: previousError } = await supabase
        .from('work_orders')
        .select('id, total_cost, customer_id, created_at')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      if (previousError) throw previousError;

      // Calculate period metrics
      const currentRevenue = (currentOrders || []).reduce((sum, o) => sum + (o.total_cost || 0), 0);
      const previousRevenue = (previousOrders || []).reduce((sum, o) => sum + (o.total_cost || 0), 0);
      const currentOrderCount = currentOrders?.length || 0;
      const previousOrderCount = previousOrders?.length || 0;
      const currentCustomers = new Set((currentOrders || []).map(o => o.customer_id).filter(Boolean)).size;
      const previousCustomers = new Set((previousOrders || []).map(o => o.customer_id).filter(Boolean)).size;

      // Calculate growth percentages
      const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const ordersGrowth = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0;
      const customersGrowth = previousCustomers > 0 ? ((currentCustomers - previousCustomers) / previousCustomers) * 100 : 0;

      setComparisonData({
        periods: [
          { name: 'Current', revenue: currentRevenue, orders: currentOrderCount, customers: currentCustomers },
          { name: 'Previous', revenue: previousRevenue, orders: previousOrderCount, customers: previousCustomers }
        ],
        growth: {
          revenue: Math.round(revenueGrowth * 10) / 10,
          orders: Math.round(ordersGrowth * 10) / 10,
          customers: Math.round(customersGrowth * 10) / 10
        }
      });

      // Calculate revenue breakdown by service type
      const serviceTypeBreakdown: Record<string, number> = {};
      (currentOrders || []).forEach(order => {
        const type = order.service_type || 'Other';
        serviceTypeBreakdown[type] = (serviceTypeBreakdown[type] || 0) + (order.total_cost || 0);
      });

      const breakdown: RevenueBreakdown[] = Object.entries(serviceTypeBreakdown)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: currentRevenue > 0 ? Math.round((amount / currentRevenue) * 100) : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Calculate daily trends
      const dailyRevenue: Record<string, { value: number; orders: number }> = {};
      (currentOrders || []).forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        if (!dailyRevenue[date]) {
          dailyRevenue[date] = { value: 0, orders: 0 };
        }
        dailyRevenue[date].value += order.total_cost || 0;
        dailyRevenue[date].orders += 1;
      });

      const trends: RevenueTrend[] = Object.entries(dailyRevenue)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Fetch top customers
      const customerRevenue: Record<string, { revenue: number; orders: number }> = {};
      (currentOrders || []).forEach(order => {
        if (order.customer_id) {
          if (!customerRevenue[order.customer_id]) {
            customerRevenue[order.customer_id] = { revenue: 0, orders: 0 };
          }
          customerRevenue[order.customer_id].revenue += order.total_cost || 0;
          customerRevenue[order.customer_id].orders += 1;
        }
      });

      const topCustomerIds = Object.entries(customerRevenue)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([id]) => id);

      let topCustomers: TopCustomer[] = [];
      if (topCustomerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, first_name, last_name, company')
          .in('id', topCustomerIds);

        topCustomers = topCustomerIds.map(id => {
          const customer = customers?.find(c => c.id === id);
          const customerName = customer 
            ? (customer.company || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer')
            : 'Unknown Customer';
          return {
            name: customerName,
            revenue: customerRevenue[id].revenue,
            orders: customerRevenue[id].orders
          };
        });
      }

      setDrillDownData({
        revenue: {
          breakdown: breakdown.length > 0 ? breakdown : [
            { category: 'Services', amount: currentRevenue, percentage: 100 }
          ],
          trends,
          topCustomers
        }
      });

      // Calculate KPI data from actual metrics
      const completedOrders = (currentOrders || []).filter(o => 
        (o as any).status === 'completed'
      ).length;
      const completionRate = currentOrderCount > 0 ? (completedOrders / currentOrderCount) * 100 : 0;
      const avgOrderValue = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;

      setKpiData({
        metrics: [
          {
            name: 'Order Completion Rate',
            current: Math.round(completionRate),
            target: 90,
            status: completionRate >= 90 ? 'on-track' : completionRate >= 75 ? 'warning' : 'behind'
          },
          {
            name: 'Average Order Value',
            current: Math.round(avgOrderValue),
            target: 500,
            status: avgOrderValue >= 500 ? 'on-track' : avgOrderValue >= 350 ? 'warning' : 'behind'
          },
          {
            name: 'Customer Retention',
            current: currentCustomers,
            target: previousCustomers > 0 ? Math.round(previousCustomers * 1.1) : 10,
            status: currentCustomers >= previousCustomers ? 'on-track' : 'warning'
          }
        ]
      });

    } catch (err) {
      console.error('Error fetching enhanced analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load enhanced analytics');
    } finally {
      setIsLoadingEnhanced(false);
    }
  };

  useEffect(() => {
    fetchEnhancedAnalytics();
  }, [timeRange]);

  return {
    comparisonData,
    drillDownData,
    kpiData,
    isLoadingEnhanced,
    error,
    refetch: fetchEnhancedAnalytics
  };
}
