import { supabase } from '@/integrations/supabase/client';

export interface CustomerValueData {
  month: string;
  value: number;
}

export interface ServiceCategoryData {
  name: string;
  value: number;
  count: number;
}

export interface CustomerAnalytics {
  clvHistory: CustomerValueData[];
  serviceCategories: ServiceCategoryData[];
  totalSpent: number;
  totalVisits: number;
  averageOrderValue: number;
}

export const customerAnalyticsService = {
  /**
   * Get comprehensive analytics for a specific customer
   */
  async getCustomerAnalytics(customerId: string): Promise<CustomerAnalytics> {
    try {
      // Get all work orders for this customer with financial data
      const { data: workOrders, error: workOrderError } = await supabase
        .from('work_orders')
        .select(`
          id,
          total_cost,
          created_at,
          service_type,
          status,
          description
        `)
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (workOrderError) {
        console.error('Error fetching work orders:', workOrderError);
        return this.getEmptyAnalytics();
      }

      const orders = workOrders || [];

      // Calculate month-by-month CLV history
      const clvHistory = this.calculateCLVHistory(orders);

      // Calculate service category distribution
      const serviceCategories = this.calculateServiceCategories(orders);

      // Calculate summary metrics
      const totalSpent = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);
      const totalVisits = orders.length;
      const averageOrderValue = totalVisits > 0 ? totalSpent / totalVisits : 0;

      return {
        clvHistory,
        serviceCategories,
        totalSpent,
        totalVisits,
        averageOrderValue
      };
    } catch (error) {
      console.error('Error calculating customer analytics:', error);
      return this.getEmptyAnalytics();
    }
  },

  /**
   * Calculate cumulative customer lifetime value by month
   */
  calculateCLVHistory(orders: any[]): CustomerValueData[] {
    if (!orders.length) return [];

    const monthlyData = new Map<string, number>();
    let cumulativeValue = 0;

    // Sort orders by date and calculate cumulative value
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      
      cumulativeValue += order.total_cost || 0;
      monthlyData.set(monthKey, cumulativeValue);
    });

    // Convert to array and ensure we have at least 12 months of data
    const result = Array.from(monthlyData.entries()).map(([month, value]) => ({
      month,
      value: Math.round(value)
    }));

    // If we have less than 12 months, pad with zeros at the beginning
    while (result.length < 12) {
      const firstMonth = result[0];
      if (firstMonth) {
        const date = new Date(firstMonth.month + ' 1, 2023');
        date.setMonth(date.getMonth() - 1);
        const prevMonth = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        result.unshift({ month: prevMonth, value: 0 });
      } else {
        // Start with current month if no data
        const date = new Date();
        date.setMonth(date.getMonth() - result.length);
        const month = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        result.push({ month, value: 0 });
      }
    }

    return result.slice(-12); // Return last 12 months
  },

  /**
   * Calculate service category distribution
   */
  calculateServiceCategories(orders: any[]): ServiceCategoryData[] {
    if (!orders.length) {
      return [
        { name: 'No services yet', value: 100, count: 0 }
      ];
    }

    const categoryMap = new Map<string, { value: number; count: number }>();
    const totalValue = orders.reduce((sum, order) => sum + (order.total_cost || 0), 0);

    orders.forEach(order => {
      const category = this.categorizeService(order.service_type, order.description);
      const cost = order.total_cost || 0;
      
      const existing = categoryMap.get(category) || { value: 0, count: 0 };
      categoryMap.set(category, {
        value: existing.value + cost,
        count: existing.count + 1
      });
    });

    // Convert to percentage-based array
    return Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      value: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
      count: data.count
    })).sort((a, b) => b.value - a.value);
  },

  /**
   * Categorize service type based on service_type and description
   */
  categorizeService(serviceType?: string, description?: string): string {
    const text = `${serviceType || ''} ${description || ''}`.toLowerCase();
    
    if (text.includes('repair') || text.includes('fix') || text.includes('replace')) {
      return 'Repair';
    } else if (text.includes('maintenance') || text.includes('service') || text.includes('check')) {
      return 'Maintenance';
    } else if (text.includes('upgrade') || text.includes('install') || text.includes('add')) {
      return 'Upgrade';
    } else if (text.includes('inspection') || text.includes('diagnostic')) {
      return 'Inspection';
    } else {
      return 'Other';
    }
  },

  /**
   * Return empty analytics structure
   */
  getEmptyAnalytics(): CustomerAnalytics {
    return {
      clvHistory: [],
      serviceCategories: [],
      totalSpent: 0,
      totalVisits: 0,
      averageOrderValue: 0
    };
  }
};