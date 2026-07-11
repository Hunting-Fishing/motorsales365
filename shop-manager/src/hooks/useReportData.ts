
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ReportData {
  topCustomers: Array<{
    customer_name: string;
    total_revenue: number;
    work_order_count: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  servicesByCategory: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
}

export function useReportData() {
  const [reportData, setReportData] = useState<ReportData>({
    topCustomers: [],
    revenueByMonth: [],
    servicesByCategory: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch top customers data using explicit JOIN
      const { data: topCustomersData, error: topCustomersError } = await supabase
        .from('work_orders')
        .select(`
          customer_id,
          total_cost,
          customer:customers!work_orders_customer_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .not('customer_id', 'is', null);

      if (topCustomersError) throw topCustomersError;

      // Process top customers data
      const customerMap = new Map();
      (topCustomersData || []).forEach((order: any) => {
        const customerId = order.customer_id;
        const customerName = order.customer 
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : 'Unknown Customer';
        const revenue = order.total_cost || 0;

        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId);
          existing.total_revenue += revenue;
          existing.work_order_count += 1;
        } else {
          customerMap.set(customerId, {
            customer_name: customerName,
            total_revenue: revenue,
            work_order_count: 1
          });
        }
      });

      const topCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10);

      // Fetch revenue by month
      const { data: revenueData, error: revenueError } = await supabase
        .from('work_orders')
        .select('created_at, total_cost')
        .not('total_cost', 'is', null);

      if (revenueError) throw revenueError;

      // Process revenue by month
      const monthlyRevenueMap = new Map();
      (revenueData || []).forEach(order => {
        const date = new Date(order.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const revenue = order.total_cost || 0;

        if (monthlyRevenueMap.has(monthKey)) {
          monthlyRevenueMap.set(monthKey, monthlyRevenueMap.get(monthKey) + revenue);
        } else {
          monthlyRevenueMap.set(monthKey, revenue);
        }
      });

      const revenueByMonth = Array.from(monthlyRevenueMap.entries())
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Fetch services by category
      const { data: servicesData, error: servicesError } = await supabase
        .from('work_orders')
        .select('service_type, total_cost')
        .not('service_type', 'is', null);

      if (servicesError) throw servicesError;

      // Process services by category
      const categoryMap = new Map();
      (servicesData || []).forEach(order => {
        const category = order.service_type || 'Unknown';
        const revenue = order.total_cost || 0;

        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category);
          existing.count += 1;
          existing.revenue += revenue;
        } else {
          categoryMap.set(category, { category, count: 1, revenue });
        }
      });

      const servicesByCategory = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue);

      setReportData({
        topCustomers,
        revenueByMonth,
        servicesByCategory
      });

    } catch (err: any) {
      console.error('Error fetching report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    reportData,
    loading,
    error,
    refetch: fetchReportData
  };
}
