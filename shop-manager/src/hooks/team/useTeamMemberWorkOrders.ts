
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface WorkOrderSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  due_date: string | null;
  description: string | null;
  customer_name?: string;
  equipment_name?: string;
}

interface MaintenanceRequestSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  description: string | null;
  type: 'assigned' | 'requested' | 'completed';
}

export function useTeamMemberWorkOrders(memberId: string) {
  const [workOrders, setWorkOrders] = useState<WorkOrderSummary[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkOrders = async () => {
      if (!memberId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch work orders where user is technician
        const { data: woData, error: woError } = await supabase
          .from('work_orders')
          .select(`
            id,
            work_order_number,
            status,
            priority,
            created_at,
            start_time,
            end_time,
            description,
            customer_complaint,
            service_type,
            customers!fk_work_orders_customer (
              first_name,
              last_name
            ),
            equipment_assets!work_orders_equipment_id_fkey (
              name,
              model,
              asset_number
            )
          `)
          .eq('technician_id', memberId)
          .order('created_at', { ascending: false });

        if (woError) throw woError;

        const formattedWorkOrders = (woData || []).map(wo => ({
          id: wo.id,
          title: wo.work_order_number || wo.service_type || 'Work Order',
          status: wo.status || 'pending',
          priority: wo.priority || 'medium',
          created_at: wo.created_at,
          due_date: wo.end_time,
          description: wo.description || wo.customer_complaint || null,
          customer_name: wo.customers 
            ? `${(wo.customers as any).first_name || ''} ${(wo.customers as any).last_name || ''}`.trim() || 'Unknown Customer'
            : 'Unknown Customer',
          equipment_name: wo.equipment_assets
            ? `${(wo.equipment_assets as any).name || ''} ${(wo.equipment_assets as any).model || ''}`.trim() || null
            : null
        }));

        setWorkOrders(formattedWorkOrders);

        // Fetch maintenance requests
        const { data: mrData, error: mrError } = await supabase
          .from('maintenance_requests')
          .select('id, title, status, priority, created_at, description, assigned_to, requested_by, completed_by')
          .or(`assigned_to.eq.${memberId},requested_by.eq.${memberId},completed_by.eq.${memberId}`)
          .order('created_at', { ascending: false });

        if (mrError) throw mrError;

        const formattedRequests = (mrData || []).map(mr => {
          let type: 'assigned' | 'requested' | 'completed' = 'assigned';
          if (mr.requested_by === memberId) type = 'requested';
          if (mr.completed_by === memberId) type = 'completed';

          return {
            id: mr.id,
            title: mr.title || 'Untitled Request',
            status: mr.status || 'pending',
            priority: mr.priority || 'medium',
            created_at: mr.created_at,
            description: mr.description,
            type
          };
        });

        setMaintenanceRequests(formattedRequests);
      } catch (err) {
        console.error('Error fetching work orders:', err);
        setError('Failed to load work orders');
        toast.error('Failed to load work orders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkOrders();
  }, [memberId]);

  const stats = {
    total: workOrders.length + maintenanceRequests.length,
    assigned: workOrders.filter(wo => wo.status === 'assigned').length + 
              maintenanceRequests.filter(mr => mr.type === 'assigned' && mr.status !== 'completed').length,
    inProgress: workOrders.filter(wo => wo.status === 'in_progress').length + 
                maintenanceRequests.filter(mr => mr.status === 'in_progress').length,
    completed: workOrders.filter(wo => wo.status === 'completed').length + 
               maintenanceRequests.filter(mr => mr.status === 'completed').length
  };

  return {
    workOrders,
    maintenanceRequests,
    stats,
    isLoading,
    error
  };
}
