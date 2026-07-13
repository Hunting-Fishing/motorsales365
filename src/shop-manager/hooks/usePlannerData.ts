import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { PlannerBoardItem, PlannerBoardColumn, PlannerSwimlane, PlannerPreferences } from '@/types/planner';
import { toast } from 'sonner';

export function usePlannerColumns(boardId: string = 'default') {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['planner-columns', boardId, shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('planner_board_columns')
        .select('*')
        .eq('shop_id', shopId)
        .eq('board_id', boardId)
        .eq('is_active', true)
        .order('column_order');
      
      if (error) throw error;
      return data as PlannerBoardColumn[];
    },
    enabled: !!shopId,
  });
}

export function usePlannerItems(boardType?: string, columnId?: string) {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['planner-items', boardType, columnId, shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      let query = supabase
        .from('planner_board_items')
        .select('*')
        .eq('shop_id', shopId);
      
      if (boardType) {
        query = query.eq('board_type', boardType);
      }
      
      if (columnId) {
        query = query.eq('column_id', columnId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PlannerBoardItem[];
    },
    enabled: !!shopId,
  });
}

export function usePlannerSwimlanes(boardId: string = 'default') {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['planner-swimlanes', boardId, shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('planner_swimlanes')
        .select('*')
        .eq('shop_id', shopId)
        .eq('board_id', boardId)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as PlannerSwimlane[];
    },
    enabled: !!shopId,
  });
}

export function useWorkOrdersForPlanner() {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['work-orders-planner', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          description,
          status,
          priority,
          start_time,
          end_time,
          estimated_hours,
          customer_id,
          technician_id
        `)
        .eq('shop_id', shopId)
        .not('status', 'eq', 'completed')
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(wo => ({
        ...wo,
        title: wo.description || 'Untitled',
      }));
    },
    enabled: !!shopId,
  });
}

export function useStaffForPlanner() {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['staff-planner', shopId],
    queryFn: async () => {
      if (!shopId) return [] as Array<{id: string; first_name: string | null; last_name: string | null; email: string | null; job_title: string | null; avatar_url: string | null}>;
      
      const client = supabase as any;
      const result = await client
        .from('profiles')
        .select('id, first_name, last_name, email, job_title')
        .eq('shop_id', shopId)
        .order('first_name');
      
      if (result.error) throw result.error;
      return (result.data || []).map((s: any) => ({ 
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        email: s.email,
        job_title: s.job_title,
        avatar_url: null as string | null
      }));
    },
    enabled: !!shopId,
  });
}

export function useEquipmentForPlanner() {
  const { shopId } = useShopId();
  
  return useQuery({
    queryKey: ['equipment-planner', shopId],
    queryFn: async () => {
      if (!shopId) return [] as Array<{id: string; name: string; equipment_type: string | null; status: string | null; unit_number: string | null}>;
      
      const client = supabase as any;
      const result = await client
        .from('equipment_assets')
        .select('id, name, equipment_type, status, unit_number')
        .eq('shop_id', shopId)
        .order('name');
      
      if (result.error) throw result.error;
      return (result.data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        equipment_type: e.equipment_type,
        status: e.status,
        unit_number: e.unit_number
      }));
    },
    enabled: !!shopId,
  });
}

export function usePlannerMutations() {
  const queryClient = useQueryClient();
  const { shopId } = useShopId();
  
  const createItem = useMutation({
    mutationFn: async (item: Partial<PlannerBoardItem>) => {
      if (!shopId) throw new Error('No shop ID');
      
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('planner_board_items')
        .insert({
          title: item.title || 'Untitled',
          board_type: item.board_type || 'kanban',
          item_type: item.item_type || 'task',
          content: item.content,
          position_x: item.position_x,
          position_y: item.position_y,
          width: item.width,
          height: item.height,
          color: item.color,
          column_id: item.column_id,
          row_id: item.row_id,
          swimlane_resource_type: item.swimlane_resource_type,
          swimlane_resource_id: item.swimlane_resource_id,
          work_order_id: item.work_order_id,
          employee_id: item.employee_id,
          equipment_id: item.equipment_id,
          vehicle_id: item.vehicle_id,
          customer_id: item.customer_id,
          inventory_item_id: item.inventory_item_id,
          start_date: item.start_date,
          end_date: item.end_date,
          duration_hours: item.duration_hours,
          depends_on: item.depends_on,
          priority: item.priority,
          status: item.status,
          z_index: item.z_index,
          is_locked: item.is_locked,
          shop_id: shopId,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-items'] });
      toast.success('Item created');
    },
    onError: (error) => {
      toast.error('Failed to create item');
      console.error(error);
    },
  });
  
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlannerBoardItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('planner_board_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-items'] });
    },
    onError: (error) => {
      toast.error('Failed to update item');
      console.error(error);
    },
  });
  
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planner_board_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-items'] });
      toast.success('Item deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete item');
      console.error(error);
    },
  });
  
  const moveItem = useMutation({
    mutationFn: async ({ id, column_id, row_id }: { id: string; column_id?: string; row_id?: string }) => {
      const { data, error } = await supabase
        .from('planner_board_items')
        .update({ column_id, row_id })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-items'] });
    },
  });
  
  return {
    createItem,
    updateItem,
    deleteItem,
    moveItem,
  };
}
