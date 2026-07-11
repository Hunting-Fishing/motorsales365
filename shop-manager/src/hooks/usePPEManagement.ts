import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';

export interface PPEItem {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  description?: string;
  manufacturer?: string;
  model_number?: string;
  quantity_in_stock: number;
  minimum_stock_level?: number;
  unit_cost?: number;
  expiry_tracking?: boolean;
  inspection_frequency_days?: number;
  certification_required?: boolean;
  storage_location?: string;
  is_active?: boolean;
  created_at: string;
}

export interface PPEAssignment {
  id: string;
  shop_id: string;
  ppe_item_id: string;
  employee_id: string;
  assigned_date: string;
  quantity: number;
  serial_number?: string;
  condition?: string;
  expiry_date?: string;
  last_inspection_date?: string;
  next_inspection_date?: string;
  status?: string;
  notes?: string;
  returned_date?: string;
  return_condition?: string;
  in_service_date?: string;
  out_of_service_date?: string;
  out_of_service_reason?: string;
  created_at: string;
  ppe_inventory?: PPEItem;
  profiles?: { first_name: string; last_name: string; email: string };
}

export interface PPEHistory {
  id: string;
  shop_id: string;
  assignment_id?: string;
  ppe_item_id?: string;
  employee_id?: string;
  event_type: string;
  event_date: string;
  previous_status?: string;
  new_status?: string;
  condition_before?: string;
  condition_after?: string;
  notes?: string;
  performed_by?: string;
  performed_by_name?: string;
  metadata?: Record<string, any>;
  created_at: string;
  ppe_inventory?: { name: string; category: string };
  profiles?: { first_name: string; last_name: string; email: string };
}

export interface PPEInspection {
  id: string;
  shop_id: string;
  assignment_id: string;
  inspection_date: string;
  inspector_id?: string;
  inspector_name: string;
  condition_rating: string;
  passed: boolean;
  findings?: string;
  action_required?: string;
  action_taken?: string;
  next_inspection_date?: string;
  photos?: string[];
  created_at: string;
}

export const usePPEManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();

  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['ppe-inventory', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('ppe_inventory')
        .select('*')
        .eq('shop_id', shopId)
        .order('name');
      if (error) throw error;
      return data as PPEItem[];
    },
    enabled: !!shopId,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['ppe-assignments', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('ppe_assignments')
        .select(`
          *,
          ppe_inventory(*),
          profiles(first_name, last_name, email)
        `)
        .eq('shop_id', shopId)
        .order('assigned_date', { ascending: false });
      if (error) throw error;
      return data as PPEAssignment[];
    },
    enabled: !!shopId,
  });

  const { data: inspections = [], isLoading: loadingInspections } = useQuery({
    queryKey: ['ppe-inspections', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('ppe_inspections')
        .select('*')
        .eq('shop_id', shopId)
        .order('inspection_date', { ascending: false });
      if (error) throw error;
      return data as PPEInspection[];
    },
    enabled: !!shopId,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['ppe-history', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('ppe_history')
        .select(`
          *,
          ppe_inventory(name, category)
        `)
        .eq('shop_id', shopId)
        .order('event_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as PPEHistory[];
    },
    enabled: !!shopId,
  });

  const createInventoryItem = useMutation({
    mutationFn: async (item: Partial<PPEItem>) => {
      if (!shopId) throw new Error('No shop ID');
      const insertData = {
        name: item.name || '',
        category: item.category || '',
        description: item.description,
        manufacturer: item.manufacturer,
        model_number: item.model_number,
        quantity_in_stock: item.quantity_in_stock || 0,
        minimum_stock_level: item.minimum_stock_level,
        unit_cost: item.unit_cost,
        expiry_tracking: item.expiry_tracking,
        inspection_frequency_days: item.inspection_frequency_days,
        certification_required: item.certification_required,
        storage_location: item.storage_location,
        shop_id: shopId,
      };
      const { data, error } = await supabase
        .from('ppe_inventory')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppe-inventory'] });
      toast({ title: 'PPE item added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding PPE item', description: error.message, variant: 'destructive' });
    },
  });

  const updateInventoryItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PPEItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('ppe_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppe-inventory'] });
      toast({ title: 'PPE item updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating PPE item', description: error.message, variant: 'destructive' });
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (assignment: Partial<PPEAssignment>) => {
      if (!shopId) throw new Error('No shop ID');
      const insertData = {
        ppe_item_id: assignment.ppe_item_id || '',
        employee_id: assignment.employee_id || '',
        quantity: assignment.quantity || 1,
        serial_number: assignment.serial_number,
        condition: assignment.condition,
        expiry_date: assignment.expiry_date,
        notes: assignment.notes,
        shop_id: shopId,
      };
      const { data, error } = await supabase
        .from('ppe_assignments')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppe-assignments'] });
      toast({ title: 'PPE assigned successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error assigning PPE', description: error.message, variant: 'destructive' });
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PPEAssignment> & { id: string }) => {
      const { data, error } = await supabase
        .from('ppe_assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppe-assignments'] });
      toast({ title: 'Assignment updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating assignment', description: error.message, variant: 'destructive' });
    },
  });

  const createInspection = useMutation({
    mutationFn: async (inspection: Partial<PPEInspection>) => {
      if (!shopId) throw new Error('No shop ID');
      const insertData = {
        assignment_id: inspection.assignment_id || '',
        inspection_date: inspection.inspection_date,
        inspector_id: inspection.inspector_id,
        inspector_name: inspection.inspector_name || '',
        condition_rating: inspection.condition_rating || '',
        passed: inspection.passed ?? false,
        findings: inspection.findings,
        action_required: inspection.action_required,
        action_taken: inspection.action_taken,
        next_inspection_date: inspection.next_inspection_date,
        photos: inspection.photos,
        shop_id: shopId,
      };
      const { data, error } = await supabase
        .from('ppe_inspections')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppe-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['ppe-assignments'] });
      toast({ title: 'Inspection recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording inspection', description: error.message, variant: 'destructive' });
    },
  });

  return {
    inventory,
    assignments,
    inspections,
    history,
    loadingInventory,
    loadingAssignments,
    loadingInspections,
    loadingHistory,
    createInventoryItem,
    updateInventoryItem,
    createAssignment,
    updateAssignment,
    createInspection,
  };
};
