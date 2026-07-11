import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { DailyShopInspection, InspectionOverallStatus, InspectionShift, FloorCondition, ToolsCondition, ChecklistItem } from '@/types/safety';

export interface CreateInspectionData {
  inspection_date: string;
  shift?: InspectionShift;
  inspector_name: string;
  checklist_items?: Record<string, ChecklistItem>;
  fire_extinguishers_ok?: boolean;
  emergency_exits_clear?: boolean;
  first_aid_kit_stocked?: boolean;
  spill_kit_available?: boolean;
  ventilation_working?: boolean;
  floor_condition?: FloorCondition;
  lighting_adequate?: boolean;
  ppe_available?: boolean;
  tools_condition?: ToolsCondition;
  hazards_identified?: string[];
  corrective_actions_needed?: string;
  overall_status: InspectionOverallStatus;
  notes?: string;
  inspector_signature?: string;
  photos?: string[];
}

export function useDailyInspections() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<DailyShopInspection[]>([]);

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
        .from('daily_shop_inspections' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('inspection_date', { ascending: false }) as any);

      if (error) throw error;
      setInspections((data || []) as DailyShopInspection[]);
    } catch (error: any) {
      console.error('Error fetching daily inspections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load daily inspections',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createInspection = async (data: CreateInspectionData) => {
    if (!shopId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: inspection, error } = await (supabase
        .from('daily_shop_inspections' as any)
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
        description: 'Daily inspection submitted successfully'
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

  const getTodayInspection = async () => {
    if (!shopId) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const { data } = await (supabase
      .from('daily_shop_inspections' as any)
      .select('*')
      .eq('shop_id', shopId)
      .eq('inspection_date', today)
      .maybeSingle() as any);
    
    return data as DailyShopInspection | null;
  };

  return {
    loading,
    inspections,
    createInspection,
    getTodayInspection,
    refetch: fetchInspections
  };
}
