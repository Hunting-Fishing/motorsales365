
import { supabase } from "@/lib/supabase";
import { MonthlyRevenueData } from "@/types/dashboard";
import { subDays, format } from "date-fns";

export const getRevenueData = async (): Promise<MonthlyRevenueData[]> => {
  try {
    console.log("Fetching live revenue data from work orders...");

    // Get completed work orders from the last 30 days with total cost
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('total_cost, updated_at, status')
      .eq('status', 'completed')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: true });

    if (error) throw error;

    // Group by date and sum revenue
    const revenueByDate = new Map<string, number>();
    
    if (workOrders && workOrders.length > 0) {
      workOrders.forEach(order => {
        const date = format(new Date(order.updated_at), 'MMM dd');
        const revenue = order.total_cost || 0;
        revenueByDate.set(date, (revenueByDate.get(date) || 0) + revenue);
      });
    }

    // Fill in missing dates with 0 revenue
    const result: MonthlyRevenueData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'MMM dd');
      result.push({
        date: dateKey,
        revenue: revenueByDate.get(dateKey) || 0
      });
    }

    console.log("Live revenue data loaded:", result.length, "data points");
    return result;

  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return [];
  }
};
