import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';

export function useAutomotiveStats() {
  return useQuery({
    queryKey: ['automotive-stats'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Fetch work orders stats
      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('status, total_cost, created_at');

      if (woError) throw woError;

      const pendingJobs = workOrders?.filter(wo => wo.status === 'pending').length || 0;
      const inProgressJobs = workOrders?.filter(wo => wo.status === 'in_progress').length || 0;
      const awaitingPartsJobs = workOrders?.filter(wo => wo.status === 'awaiting_parts').length || 0;
      const completedJobs = workOrders?.filter(wo => 
        wo.status === 'completed' && 
        wo.created_at >= monthStart && 
        wo.created_at <= monthEnd
      ).length || 0;

      const revenue = workOrders
        ?.filter(wo => wo.status === 'completed' && wo.created_at >= monthStart && wo.created_at <= monthEnd)
        .reduce((sum, wo) => sum + (wo.total_cost || 0), 0) || 0;

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0];
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('id')
        .gte('date', today)
        .lt('date', today + 'T23:59:59');

      if (apptError) throw apptError;

      const todayAppointments = appointments?.length || 0;

      // Fetch overdue invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id')
        .eq('status', 'unpaid')
        .lt('due_date', today);

      if (invError) throw invError;

      const overdueInvoices = invoices?.length || 0;

      // Fetch low stock parts
      const { data: inventory, error: invtError } = await supabase
        .from('inventory')
        .select('id, quantity, reorder_point')
        .not('reorder_point', 'is', null);

      if (invtError) throw invtError;

      const lowStockParts = inventory?.filter(item => item.quantity <= (item.reorder_point || 0)).length || 0;

      return {
        pendingJobs,
        inProgressJobs,
        awaitingPartsJobs,
        completedJobs,
        revenue,
        todayAppointments,
        overdueInvoices,
        lowStockParts,
      };
    },
    staleTime: 30000,
  });
}

export function useAutomotiveWorkOrders() {
  return useQuery({
    queryKey: ['automotive-work-orders-recent'],
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

export function useAutomotiveAppointments() {
  return useQuery({
    queryKey: ['automotive-appointments-upcoming'],
    queryFn: async () => {
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          status,
          notes,
          customers (first_name, last_name),
          vehicles (make, model, year)
        `)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });
}
