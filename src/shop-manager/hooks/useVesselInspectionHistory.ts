import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VesselInspectionRecord {
  id: string;
  vessel_id: string;
  inspector_id: string | null;
  inspector_name: string;
  inspection_date: string;
  current_hours: number | null;
  overall_status: string;
  safe_to_operate: boolean;
  general_notes: string | null;
  has_concerns: boolean;
  concern_acknowledged: boolean;
  created_at: string;
  vessel?: {
    name: string;
    asset_number: string | null;
  };
  items?: VesselInspectionItemRecord[];
}

export interface VesselInspectionItemRecord {
  id: string;
  inspection_id: string;
  equipment_id: string | null;
  item_key: string;
  item_name: string;
  category: string | null;
  status: string;
  notes: string | null;
  location: string | null;
  hours_at_inspection: number | null;
  equipment?: {
    name: string;
    equipment_type: string | null;
  };
}

export function useVesselInspectionHistory(vesselId?: string) {
  // Fetch all inspections for a vessel
  const { data: inspections, isLoading, refetch } = useQuery({
    queryKey: ['vessel-inspection-history', vesselId],
    queryFn: async () => {
      let query = supabase
        .from('vessel_inspections')
        .select(`
          *,
          vessel:equipment_assets!vessel_id (
            name,
            asset_number
          )
        `)
        .order('inspection_date', { ascending: false });

      if (vesselId) {
        query = query.eq('vessel_id', vesselId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VesselInspectionRecord[];
    }
  });

  // Fetch inspection details with items
  const fetchInspectionDetails = async (inspectionId: string) => {
    const { data, error } = await supabase
      .from('vessel_inspections')
      .select(`
        *,
        vessel:equipment_assets!vessel_id (
          name,
          asset_number
        ),
        items:vessel_inspection_items (
          *,
          equipment:equipment_assets (
            name,
            equipment_type
          )
        )
      `)
      .eq('id', inspectionId)
      .single();

    if (error) throw error;
    return data as VesselInspectionRecord;
  };

  // Get last inspection status for a specific item
  const getLastItemStatus = (inspectionItems: VesselInspectionItemRecord[], itemKey: string, equipmentId?: string) => {
    const item = inspectionItems?.find(i => 
      i.item_key === itemKey && 
      (!equipmentId || i.equipment_id === equipmentId)
    );
    return item?.status || null;
  };

  return {
    inspections,
    isLoading,
    refetch,
    fetchInspectionDetails,
    getLastItemStatus
  };
}
