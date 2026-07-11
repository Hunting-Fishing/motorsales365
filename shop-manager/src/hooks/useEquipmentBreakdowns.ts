import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EquipmentBreakdown {
  id: string;
  equipment_id: string;
  breakdown_date: string;
  reported_by: string | null;
  breakdown_type: 'mechanical' | 'electrical' | 'hydraulic' | 'structural' | 'other';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  cause: string | null;
  hours_at_breakdown: number | null;
  downtime_hours: number | null;
  repair_cost: number | null;
  parts_used: any[];
  repair_notes: string | null;
  repaired_by: string | null;
  repaired_date: string | null;
  status: 'reported' | 'diagnosed' | 'in_repair' | 'repaired' | 'pending_parts';
  related_work_order_id: string | null;
  preventable: boolean;
  root_cause_category: string | null;
  created_at: string;
  equipment_assets?: { name: string };
}

export interface CreateBreakdownInput {
  equipment_id: string;
  breakdown_type: string;
  severity: string;
  description: string;
  cause?: string;
  hours_at_breakdown?: number;
  preventable?: boolean;
  root_cause_category?: string;
}

export function useEquipmentBreakdowns(equipmentId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const breakdownsQuery = useQuery({
    queryKey: ['equipment-breakdowns', equipmentId],
    queryFn: async () => {
      let query = supabase
        .from('equipment_breakdowns')
        .select(`
          *,
          equipment_assets(name)
        `)
        .order('breakdown_date', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EquipmentBreakdown[];
    }
  });

  const createBreakdown = useMutation({
    mutationFn: async (input: CreateBreakdownInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('equipment_breakdowns')
        .insert({
          equipment_id: input.equipment_id,
          breakdown_type: input.breakdown_type,
          severity: input.severity,
          description: input.description,
          cause: input.cause,
          hours_at_breakdown: input.hours_at_breakdown,
          preventable: input.preventable || false,
          root_cause_category: input.root_cause_category,
          reported_by: user?.user?.id,
          status: 'reported'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-breakdowns'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown-stats'] });
      toast({
        title: 'Breakdown Reported',
        description: 'Equipment breakdown has been logged successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to report breakdown: ' + error.message,
        variant: 'destructive'
      });
    }
  });

  const updateBreakdown = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EquipmentBreakdown> }) => {
      const { data, error } = await supabase
        .from('equipment_breakdowns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-breakdowns'] });
      queryClient.invalidateQueries({ queryKey: ['breakdown-stats'] });
      toast({
        title: 'Updated',
        description: 'Breakdown record updated successfully.'
      });
    }
  });

  return {
    breakdowns: breakdownsQuery.data || [],
    isLoading: breakdownsQuery.isLoading,
    createBreakdown,
    updateBreakdown,
    refetch: breakdownsQuery.refetch
  };
}
