import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComponentWithHours {
  id: string;
  name: string;
  equipment_type: string | null;
  current_hours: number | null;
  parent_equipment_id: string | null;
  last_reading_date?: string | null;
}

export interface HourReading {
  id: string;
  equipment_id: string;
  reading_value: number;
  reading_date: string;
  notes: string | null;
  recorded_by: string | null;
  equipment_name?: string;
}

export function useComponentHours(parentEquipmentId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch child components (engines, generators, etc.) for a parent equipment
  const { data: components, isLoading: loadingComponents } = useQuery({
    queryKey: ['component-hours', parentEquipmentId],
    queryFn: async () => {
      if (!parentEquipmentId) return [];

      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, equipment_type, current_hours, parent_equipment_id')
        .eq('parent_equipment_id', parentEquipmentId)
        .order('name');

      if (error) throw error;
      return data as ComponentWithHours[];
    },
    enabled: !!parentEquipmentId,
  });

  // Save hour readings for multiple components
  const saveHoursMutation = useMutation({
    mutationFn: async (readings: { equipmentId: string; hours: number; notes?: string }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert logs and update equipment for each reading
      for (const reading of readings) {
        // Insert usage log
        const { error: logError } = await supabase
          .from('equipment_usage_logs')
          .insert({
            equipment_id: reading.equipmentId,
            reading_type: 'hours',
            reading_value: reading.hours,
            reading_date: new Date().toISOString(),
            recorded_by: user.id,
            notes: reading.notes || null,
          });

        if (logError) throw logError;

        // Update equipment current hours
        const { error: updateError } = await supabase
          .from('equipment_assets')
          .update({ current_hours: reading.hours })
          .eq('id', reading.equipmentId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success('Hour readings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['component-hours'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-hour-history'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save hour readings');
    },
  });

  return {
    components: components || [],
    loadingComponents,
    saveHours: saveHoursMutation.mutate,
    savingHours: saveHoursMutation.isPending,
  };
}

// Hook to fetch hour history for an equipment
export function useEquipmentHourHistory(equipmentId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['equipment-hour-history', equipmentId, limit],
    queryFn: async () => {
      if (!equipmentId) return [];

      const { data, error } = await supabase
        .from('equipment_usage_logs')
        .select(`
          id,
          reading_value,
          reading_date,
          notes,
          recorded_by,
          profiles:recorded_by (full_name)
        `)
        .eq('equipment_id', equipmentId)
        .eq('reading_type', 'hours')
        .order('reading_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((log: any) => ({
        id: log.id,
        reading_value: log.reading_value,
        reading_date: log.reading_date,
        notes: log.notes,
        recorded_by_name: log.profiles?.full_name || 'Unknown',
      }));
    },
    enabled: !!equipmentId,
  });
}

// Hook to fetch hour history for all child components of a parent
export function useAllComponentsHourHistory(parentEquipmentId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ['all-components-hour-history', parentEquipmentId, limit],
    queryFn: async () => {
      if (!parentEquipmentId) return [];

      // First get all child equipment IDs
      const { data: children, error: childError } = await supabase
        .from('equipment_assets')
        .select('id, name')
        .eq('parent_equipment_id', parentEquipmentId);

      if (childError) throw childError;
      if (!children || children.length === 0) return [];

      const childIds = children.map(c => c.id);
      const childNameMap = Object.fromEntries(children.map(c => [c.id, c.name]));

      // Get usage logs for all children
      const { data: logs, error: logError } = await supabase
        .from('equipment_usage_logs')
        .select(`
          id,
          equipment_id,
          reading_value,
          reading_date,
          notes,
          recorded_by,
          profiles:recorded_by (full_name)
        `)
        .in('equipment_id', childIds)
        .eq('reading_type', 'hours')
        .order('reading_date', { ascending: false })
        .limit(limit);

      if (logError) throw logError;

      return logs.map((log: any) => ({
        id: log.id,
        equipment_id: log.equipment_id,
        equipment_name: childNameMap[log.equipment_id] || 'Unknown',
        reading_value: log.reading_value,
        reading_date: log.reading_date,
        notes: log.notes,
        recorded_by_name: log.profiles?.full_name || 'Unknown',
      }));
    },
    enabled: !!parentEquipmentId,
  });
}
