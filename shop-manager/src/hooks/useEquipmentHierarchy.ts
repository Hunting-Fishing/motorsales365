import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EquipmentNode {
  id: string;
  name: string;
  asset_number: string | null;
  equipment_type: string | null;
  current_hours: number | null;
  parent_equipment_id: string | null;
  children?: EquipmentNode[];
}

export function useEquipmentHierarchy() {
  // Fetch all equipment
  const { data: allEquipment, isLoading, refetch } = useQuery({
    queryKey: ['equipment-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number, equipment_type, current_hours, parent_equipment_id')
        .order('name');
      if (error) throw error;
      return data as EquipmentNode[];
    }
  });

  // Get parent equipment (vessels/main equipment - those with no parent)
  const parentEquipment = allEquipment?.filter(e => !e.parent_equipment_id) || [];

  // Get child equipment for a given parent
  const getChildEquipment = (parentId: string) => {
    return allEquipment?.filter(e => e.parent_equipment_id === parentId) || [];
  };

  // Build hierarchical tree
  const buildTree = (): EquipmentNode[] => {
    if (!allEquipment) return [];
    
    return parentEquipment.map(parent => ({
      ...parent,
      children: getChildEquipment(parent.id)
    }));
  };

  return {
    allEquipment: allEquipment || [],
    parentEquipment,
    getChildEquipment,
    hierarchyTree: buildTree(),
    isLoading,
    refetch
  };
}
