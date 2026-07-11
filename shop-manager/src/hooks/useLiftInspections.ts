import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { LiftHoistInspection, LiftInspectionType, LiftEquipmentType, ChecklistItem } from '@/types/safety';

export interface CreateLiftInspectionData {
  equipment_id?: string;
  equipment_name: string;
  equipment_type: LiftEquipmentType;
  serial_number?: string;
  location?: string;
  inspection_type: LiftInspectionType;
  inspection_date: string;
  inspector_name: string;
  checklist_items?: Record<string, ChecklistItem>;
  structural_integrity_ok?: boolean;
  hydraulic_system_ok?: boolean;
  safety_locks_ok?: boolean;
  controls_ok?: boolean;
  cables_chains_ok?: boolean;
  capacity_label_visible?: boolean;
  floor_anchors_ok?: boolean;
  lubrication_ok?: boolean;
  safe_for_use: boolean;
  deficiencies_found?: string[];
  corrective_actions?: string;
  next_inspection_date?: string;
  locked_out?: boolean;
  lockout_reason?: string;
  inspector_signature?: string;
  photos?: string[];
  notes?: string;
}

export function useLiftInspections() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<LiftHoistInspection[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchInspections();
    }
  }, [shopId]);

  const fetchInspections = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('lift_hoist_inspections' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('inspection_date', { ascending: false }) as any);

      if (error) throw error;
      setInspections((data || []) as LiftHoistInspection[]);
    } catch (error: any) {
      console.error('Error fetching lift inspections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lift inspections',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createInspection = async (data: CreateLiftInspectionData) => {
    if (!shopId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: inspection, error } = await (supabase
        .from('lift_hoist_inspections' as any)
        .insert({
          shop_id: shopId,
          inspector_id: userData.user.id,
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchInspections();
      toast({
        title: 'Success',
        description: 'Lift inspection submitted successfully'
      });
      
      return inspection;
    } catch (error: any) {
      console.error('Error creating inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit inspection',
        variant: 'destructive'
      });
      return null;
    }
  };

  const lockoutEquipment = async (inspectionId: string, reason: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('lift_hoist_inspections' as any)
        .update({
          locked_out: true,
          lockout_reason: reason,
          lockout_date: new Date().toISOString(),
          lockout_by: userData.user.id,
          safe_for_use: false
        })
        .eq('id', inspectionId) as any);

      if (error) throw error;
      
      await fetchInspections();
      toast({
        title: 'Equipment Locked Out',
        description: 'Equipment has been locked out of service'
      });
    } catch (error: any) {
      console.error('Error locking out equipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to lock out equipment',
        variant: 'destructive'
      });
    }
  };

  const getUnsafeEquipment = () => {
    return inspections.filter(i => !i.safe_for_use || i.locked_out);
  };

  return {
    loading,
    inspections,
    createInspection,
    lockoutEquipment,
    getUnsafeEquipment,
    refetch: fetchInspections
  };
}
