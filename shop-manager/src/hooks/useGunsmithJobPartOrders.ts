import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GunsmithJobPartOrder {
  id: string;
  shop_id: string | null;
  job_id: string;
  customer_id: string | null;
  part_id: string | null;
  part_number: string;
  part_name: string;
  supplier: string | null;
  supplier_contact: string | null;
  quantity_ordered: number;
  unit_cost: number | null;
  total_cost: number | null;
  order_date: string | null;
  expected_date: string | null;
  received_date: string | null;
  installed_date: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  job?: {
    job_number: string;
    customer?: {
      first_name: string;
      last_name: string;
    };
    firearm?: {
      make: string;
      model: string;
    };
  };
}

export interface CreateJobPartOrderInput {
  job_id: string;
  customer_id?: string;
  part_id?: string;
  part_number: string;
  part_name: string;
  supplier?: string;
  supplier_contact?: string;
  quantity_ordered: number;
  unit_cost?: number;
  expected_date?: string;
  notes?: string;
}

export function useGunsmithJobPartOrders(jobId?: string) {
  return useQuery({
    queryKey: ['gunsmith-job-part-orders', jobId],
    queryFn: async () => {
      let query = supabase
        .from('gunsmith_job_part_orders')
        .select(`
          *,
          job:gunsmith_jobs(
            job_number,
            customer:customers(first_name, last_name),
            firearm:gunsmith_firearms(make, model)
          )
        `)
        .order('order_date', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as GunsmithJobPartOrder[];
    },
    enabled: jobId !== undefined || true,
  });
}

export function useGunsmithPendingPartOrders() {
  return useQuery({
    queryKey: ['gunsmith-pending-part-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_job_part_orders')
        .select(`
          *,
          job:gunsmith_jobs(
            job_number,
            customer:customers(first_name, last_name),
            firearm:gunsmith_firearms(make, model)
          )
        `)
        .in('status', ['ordered', 'backordered'])
        .order('expected_date', { ascending: true });
      
      if (error) throw error;
      return data as GunsmithJobPartOrder[];
    },
  });
}

export function useCreateJobPartOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobPartOrderInput) => {
      const total_cost = input.unit_cost 
        ? input.unit_cost * input.quantity_ordered 
        : null;

      const { data, error } = await supabase
        .from('gunsmith_job_part_orders')
        .insert({
          ...input,
          total_cost,
          status: 'ordered',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-job-part-orders'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-pending-part-orders'] });
      toast.success('Part order created successfully');
    },
    onError: (error) => {
      console.error('Error creating part order:', error);
      toast.error('Failed to create part order');
    },
  });
}

export function useUpdateJobPartOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      received_date,
      installed_date 
    }: { 
      id: string; 
      status: string;
      received_date?: string;
      installed_date?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (received_date) updateData.received_date = received_date;
      if (installed_date) updateData.installed_date = installed_date;

      const { data, error } = await supabase
        .from('gunsmith_job_part_orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-job-part-orders'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-pending-part-orders'] });
      toast.success('Order status updated');
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    },
  });
}

export function useDeleteJobPartOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gunsmith_job_part_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-job-part-orders'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-pending-part-orders'] });
      toast.success('Part order deleted');
    },
    onError: (error) => {
      console.error('Error deleting part order:', error);
      toast.error('Failed to delete part order');
    },
  });
}
