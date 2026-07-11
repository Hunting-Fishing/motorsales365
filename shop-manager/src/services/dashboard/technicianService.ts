
import { supabase } from "@/lib/supabase";
import { TechnicianEfficiencyData, TechnicianPerformanceData } from "@/types/dashboard";

export const getTechnicianEfficiency = async (): Promise<TechnicianEfficiencyData[]> => {
  try {
    console.log("Fetching live technician efficiency data...");

    // Get work order time entries grouped by technician
    const { data: timeEntries, error } = await supabase
      .from('work_order_time_entries')
      .select('employee_name, duration, billable')
      .not('employee_name', 'is', null);

    if (error) throw error;

    if (!timeEntries || timeEntries.length === 0) {
      console.log("No time entries found");
      return [];
    }

    // Group by technician and calculate efficiency
    const technicianMap = new Map<string, { totalHours: number; billableHours: number }>();

    timeEntries.forEach(entry => {
      const name = entry.employee_name;
      const hours = entry.duration / 60; // Convert minutes to hours
      const billableHours = entry.billable ? hours : 0;

      if (!technicianMap.has(name)) {
        technicianMap.set(name, { totalHours: 0, billableHours: 0 });
      }

      const current = technicianMap.get(name)!;
      current.totalHours += hours;
      current.billableHours += billableHours;
    });

    const result: TechnicianEfficiencyData[] = Array.from(technicianMap.entries()).map(([name, data]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      totalHours: Math.round(data.totalHours * 10) / 10,
      billableHours: Math.round(data.billableHours * 10) / 10,
      efficiency: data.totalHours > 0 ? Math.round((data.billableHours / data.totalHours) * 100) : 0
    }));

    console.log("Live technician efficiency data loaded:", result.length, "technicians");
    return result;

  } catch (error) {
    console.error("Error fetching technician efficiency:", error);
    return [];
  }
};

export const getTechnicianPerformance = async (): Promise<TechnicianPerformanceData> => {
  try {
    console.log("Fetching live technician performance data...");

    // Get completed work orders with technician data from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('technician_id, updated_at, total_cost, profiles:technician_id(full_name)')
      .eq('status', 'completed')
      .not('technician_id', 'is', null)
      .gte('updated_at', sixMonthsAgo.toISOString());

    if (error) throw error;

    if (!workOrders || workOrders.length === 0) {
      console.log("No completed work orders found");
      return { technicians: [], chartData: [] };
    }

    // Group by month and technician
    const monthlyData = new Map<string, Map<string, number>>();
    const technicianSet = new Set<string>();

    workOrders.forEach(order => {
      const month = new Date(order.updated_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const technician = (order as any).profiles?.full_name || `Technician ${order.technician_id}`;
      const revenue = order.total_cost || 0;

      technicianSet.add(technician);

      if (!monthlyData.has(month)) {
        monthlyData.set(month, new Map());
      }

      const monthData = monthlyData.get(month)!;
      monthData.set(technician, (monthData.get(technician) || 0) + revenue);
    });

    const technicians = Array.from(technicianSet);
    const chartData = Array.from(monthlyData.entries()).map(([month, techData]) => {
      const monthEntry: any = { month };
      technicians.forEach(tech => {
        const techKey = tech.toLowerCase().replace(/\s+/g, '_');
        monthEntry[techKey] = techData.get(tech) || 0;
      });
      return monthEntry;
    });

    console.log("Live technician performance data loaded:", chartData.length, "months");
    return { technicians, chartData };

  } catch (error) {
    console.error("Error fetching technician performance:", error);
    return { technicians: [], chartData: [] };
  }
};
