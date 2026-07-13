
import { supabase } from "@/lib/supabase";

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

export const getDashboardAlerts = async (): Promise<DashboardAlert[]> => {
  try {
    console.log("Fetching dashboard alerts...");
    
    const alerts: DashboardAlert[] = [];
    
    // Check for low stock inventory items - skip this check as column doesn't exist
    const lowStockItems: any[] = [];

    if (!lowStockItems || lowStockItems.length === 0) {
      // No low stock items
    } else {
      alerts.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockItems.length} item(s) are running low on stock`,
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
    }

    // Check for overdue work orders
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { data: overdueOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .neq('status', 'completed')
      .lt('updated_at', oneDayAgo.toISOString());

    if (!woError && overdueOrders && overdueOrders.length > 0) {
      alerts.push({
        id: 'overdue-orders',
        type: 'error',
        title: 'Overdue Work Orders',
        message: `${overdueOrders.length} work order(s) may be overdue`,
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
    }

    console.log("Dashboard alerts loaded:", alerts.length);
    return alerts;

  } catch (error) {
    console.error("Error fetching dashboard alerts:", error);
    return [];
  }
};

export const getWorkOrdersByStatus = async () => {
  try {
    console.log("Fetching work orders by status...");

    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('status');

    if (error) throw error;

    const statusCounts = workOrders?.reduce((acc: Record<string, number>, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}) || {};

    const result = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      value
    }));

    console.log("Work orders by status loaded:", result);
    return result;

  } catch (error) {
    console.error("Error fetching work orders by status:", error);
    return [];
  }
};

export const getServiceTypeDistribution = async () => {
  try {
    console.log("Fetching service type distribution...");

    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('service_type');

    if (error) throw error;

    const serviceCounts = workOrders?.reduce((acc: Record<string, number>, order) => {
      const serviceType = order.service_type || 'General Service';
      acc[serviceType] = (acc[serviceType] || 0) + 1;
      return acc;
    }, {}) || {};

    const result = Object.entries(serviceCounts).map(([name, value]) => ({
      name,
      value
    }));

    console.log("Service type distribution loaded:", result);
    return result;

  } catch (error) {
    console.error("Error fetching service type distribution:", error);
    return [];
  }
};

export const getMonthlyRevenue = async () => {
  try {
    console.log("Fetching monthly revenue...");

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('total_cost, updated_at')
      .eq('status', 'completed')
      .gte('updated_at', sixMonthsAgo.toISOString())
      .order('updated_at', { ascending: true });

    if (error) throw error;

    const monthlyRevenue = new Map<string, number>();

    workOrders?.forEach(order => {
      const date = new Date(order.updated_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const revenue = order.total_cost || 0;
      monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + revenue);
    });

    // Fill in missing months with 0
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      result.push({
        month: monthKey,
        revenue: monthlyRevenue.get(monthKey) || 0
      });
    }

    console.log("Monthly revenue loaded:", result);
    return result;

  } catch (error) {
    console.error("Error fetching monthly revenue:", error);
    return [];
  }
};
