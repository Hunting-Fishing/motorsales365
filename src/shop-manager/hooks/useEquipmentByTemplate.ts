import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EquipmentAssignment {
  id: string;
  name: string;
  inspection_template_id: string;
}

export function useEquipmentByTemplate() {
  return useQuery({
    queryKey: ['equipment-template-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, inspection_template_id')
        .not('inspection_template_id', 'is', null);

      if (error) throw error;

      // Group by template ID
      const byTemplate: Record<string, EquipmentAssignment[]> = {};
      
      (data || []).forEach((eq) => {
        const templateId = eq.inspection_template_id as string;
        if (!byTemplate[templateId]) {
          byTemplate[templateId] = [];
        }
        byTemplate[templateId].push({
          id: eq.id,
          name: eq.name,
          inspection_template_id: templateId,
        });
      });

      return byTemplate;
    },
  });
}
