import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type GYRStatus = 1 | 2 | 3; // 1=Red, 2=Yellow, 3=Green

export interface EquipmentInspection {
  id: string;
  equipment_id: string;
  inspector_id: string;
  inspection_date: string;
  current_reading: number;
  reading_type: 'hours' | 'kilometers' | 'miles';
  // Legacy boolean fields (kept for backward compatibility)
  fluid_levels_ok: boolean;
  fluid_notes?: string;
  visual_damage_ok: boolean;
  visual_damage_notes?: string;
  safety_equipment_ok: boolean;
  safety_equipment_notes?: string;
  operational_ok: boolean;
  operational_notes?: string;
  // New GYR status fields
  fluid_levels_status?: GYRStatus;
  visual_damage_status?: GYRStatus;
  safety_equipment_status?: GYRStatus;
  operational_status?: GYRStatus;
  overall_status: 'pass' | 'pass_with_notes' | 'fail';
  requires_maintenance: boolean;
  urgent_repair: boolean;
  parts_needed: any[];
  general_notes?: string;
  signature_data?: string;
  created_at: string;
}

export function useEquipmentInspections(equipmentId?: string) {
  const [inspections, setInspections] = useState<EquipmentInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('equipment_inspections')
        .select('*')
        .order('inspection_date', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInspections((data || []) as EquipmentInspection[]);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load inspections',
      });
    } finally {
      setLoading(false);
    }
  }, [equipmentId, toast]);

  const createInspection = useCallback(async (inspectionData: any) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('equipment_inspections')
        .insert([{
          ...inspectionData,
          inspector_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Also create a usage log entry
      await supabase
        .from('equipment_usage_logs')
        .insert([{
          equipment_id: inspectionData.equipment_id,
          recorded_by: user.id,
          reading_type: inspectionData.reading_type,
          reading_value: inspectionData.current_reading,
          operation_type: 'pre-trip',
          notes: inspectionData.general_notes,
        }]);

      toast({
        title: 'Success',
        description: 'Pre-trip inspection completed',
      });

      await fetchInspections();
      return data;
    } catch (error) {
      console.error('Error creating inspection:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save inspection',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchInspections, toast]);

  return {
    inspections,
    loading,
    fetchInspections,
    createInspection,
  };
}
