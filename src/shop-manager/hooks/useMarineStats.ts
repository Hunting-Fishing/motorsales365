import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

export function useMarineStats() {
  return useQuery({
    queryKey: ['marine-stats'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Fetch work orders for marine vehicles
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('status, total_cost, created_at');

      if (woError) throw woError;

      const pendingJobs = workOrders?.filter(wo => wo.status === 'pending').length || 0;
      const inProgressJobs = workOrders?.filter(wo => wo.status === 'in_progress').length || 0;
      const completedJobs = workOrders?.filter(wo => 
        wo.status === 'completed' && 
        wo.created_at >= monthStart && 
        wo.created_at <= monthEnd
      ).length || 0;

      const revenue = workOrders
        ?.filter(wo => wo.status === 'completed' && wo.created_at >= monthStart && wo.created_at <= monthEnd)
        .reduce((sum, wo) => sum + (wo.total_cost || 0), 0) || 0;

      // Fetch boat inspections
      const { data: inspections, error: inspError } = await supabase
        .from('boat_inspections')
        .select('id, inspection_date')
        .gte('inspection_date', monthStart);

      if (inspError) throw inspError;

      const inspectionsThisMonth = inspections?.length || 0;

      return {
        pendingJobs,
        inProgressJobs,
        completedJobs,
        revenue,
        inspectionsThisMonth,
        dockedVessels: 0,
        scheduledHaulOuts: 0,
        winterizationsDue: 0,
      };
    },
    staleTime: 30000,
  });
}

export function useMarineWorkOrders() {
  return useQuery({
    queryKey: ['marine-work-orders-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          work_order_number,
          status,
          created_at,
          vehicles (make, model, year),
          customers (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}

export function useMarineInspections() {
  return useQuery({
    queryKey: ['marine-inspections-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_inspections')
        .select(`
          id,
          vessel_name,
          inspection_date,
          overall_condition,
          inspector_name
        `)
        .order('inspection_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}
