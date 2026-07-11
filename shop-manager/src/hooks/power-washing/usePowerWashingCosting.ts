import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  hours_worked: number;
  hourly_rate?: number;
}

interface ChemicalUsage {
  id: string;
  chemical_id: string;
  amount_used: number;
  cost_per_unit: number;
}

interface MaterialUsage {
  id: string;
  item_name: string;
  quantity_used: number;
  unit_cost_at_use: number;
  total_cost: number;
}

export interface JobCostingData {
  laborCost: number;
  laborHours: number;
  materialsCost: number;
  chemicalsCost: number;
  overheadCost: number;
  totalCost: number;
  revenue: number;
  grossProfit: number;
  profitMargin: number;
  timeEntries: TimeEntry[];
  chemicalUsage: ChemicalUsage[];
  materialUsage: MaterialUsage[];
  isLoading: boolean;
}

const DEFAULT_HOURLY_RATE = 35; // Default labor rate per hour
const DEFAULT_OVERHEAD_PERCENTAGE = 0.15; // 15% overhead

export function usePowerWashingCosting(jobId: string | undefined, quotedPrice?: number, finalPrice?: number) {
  // Fetch time entries
  const { data: timeEntries = [], isLoading: timeLoading } = useQuery({
    queryKey: ['power-washing-time-entries', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('power_washing_time_entries')
        .select('*')
        .eq('job_id', jobId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  // Fetch chemical usage
  const { data: chemicalUsage = [], isLoading: chemLoading } = useQuery({
    queryKey: ['power-washing-job-chemicals', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('power_washing_job_chemicals')
        .select(`
          *,
          chemical:power_washing_chemicals(name, cost_per_unit)
        `)
        .eq('job_id', jobId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  // Fetch material usage
  const { data: materialUsage = [], isLoading: matLoading } = useQuery({
    queryKey: ['power-washing-job-materials', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('power_washing_job_materials')
        .select('*')
        .eq('job_id', jobId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!jobId,
  });

  // Calculate hours from clock_in/clock_out
  const calculateHours = (entry: any) => {
    if (!entry.clock_in || !entry.clock_out) return 0;
    const start = new Date(entry.clock_in).getTime();
    const end = new Date(entry.clock_out).getTime();
    const breakMins = entry.break_minutes || 0;
    return Math.max(0, (end - start) / (1000 * 60 * 60) - (breakMins / 60));
  };

  const laborHours = timeEntries.reduce((sum, entry) => sum + calculateHours(entry), 0);
  const laborCost = laborHours * DEFAULT_HOURLY_RATE;

  const chemicalsCost = chemicalUsage.reduce((sum, usage: any) => {
    return sum + (usage.cost_at_use || 0);
  }, 0);

  const materialsCost = materialUsage.reduce((sum, material: any) => {
    return sum + (material.total_cost || 0);
  }, 0);

  const directCosts = laborCost + materialsCost + chemicalsCost;
  const overheadCost = directCosts * DEFAULT_OVERHEAD_PERCENTAGE;
  const totalCost = directCosts + overheadCost;
  
  const revenue = finalPrice || quotedPrice || 0;
  const grossProfit = revenue - totalCost;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    laborCost,
    laborHours,
    materialsCost,
    chemicalsCost,
    overheadCost,
    totalCost,
    revenue,
    grossProfit,
    profitMargin,
    timeEntries,
    chemicalUsage,
    materialUsage,
    isLoading: timeLoading || chemLoading || matLoading,
  };
}
