import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  inspection_template_id: string | null;
}

export function useEquipmentForTemplateAssignment() {
  return useQuery({
    queryKey: ['equipment-for-template-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, equipment_type, inspection_template_id')
        .order('name');
      
      if (error) throw error;
      return data as Equipment[];
    },
  });
}

export function useAssignTemplateToEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      templateId, 
      equipmentIds, 
      previousEquipmentIds,
      isBaseTemplate,
      templateName,
    }: { 
      templateId: string; 
      equipmentIds: string[]; 
      previousEquipmentIds: string[];
      isBaseTemplate: boolean;
      templateName: string;
    }) => {
      // Remove template from equipment that was deselected
      const toRemove = previousEquipmentIds.filter(id => !equipmentIds.includes(id));
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('equipment_assets')
          .update({ inspection_template_id: null })
          .in('id', toRemove);
        
        if (removeError) throw removeError;
      }

      // Get newly added equipment (not previously assigned)
      const newlyAssigned = equipmentIds.filter(id => !previousEquipmentIds.includes(id));
      const createdTemplates: string[] = [];

      if (newlyAssigned.length > 0) {
        // Get equipment names for naming the new templates
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment_assets')
          .select('id, name')
          .in('id', newlyAssigned);

        if (equipmentError) throw equipmentError;

        if (isBaseTemplate) {
          // For base templates: create asset-specific copies for each equipment
          const { data: sourceTemplate, error: templateError } = await supabase
            .from('inspection_form_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          if (templateError) throw templateError;

          // Fetch sections once
          const { data: sourceSections, error: sectionsError } = await supabase
            .from('inspection_form_sections')
            .select('*')
            .eq('template_id', templateId)
            .order('display_order');

          if (sectionsError) throw sectionsError;

          // Fetch items once
          let sourceItems: any[] = [];
          if (sourceSections && sourceSections.length > 0) {
            const sectionIds = sourceSections.map((s) => s.id);
            const { data: items, error: itemsError } = await supabase
              .from('inspection_form_items')
              .select('*')
              .in('section_id', sectionIds)
              .order('display_order');

            if (itemsError) throw itemsError;
            sourceItems = items || [];
          }

          // Create asset-specific template for each equipment
          for (const eq of equipmentData || []) {
            const newTemplateName = `${templateName} - ${eq.name}`;

            // Create new template
            const { data: newTemplate, error: newTemplateError } = await supabase
              .from('inspection_form_templates')
              .insert({
                name: newTemplateName,
                asset_type: sourceTemplate.asset_type,
                description: sourceTemplate.description,
                is_base_template: false, // Asset-specific
                parent_template_id: templateId, // Track lineage
                is_published: sourceTemplate.is_published,
                version: 1,
              })
              .select()
              .single();

            if (newTemplateError) throw newTemplateError;
            createdTemplates.push(newTemplateName);

            // Duplicate sections and items
            if (sourceSections && sourceSections.length > 0) {
              const sectionMapping: Record<string, string> = {};

              for (const section of sourceSections) {
                const { data: newSection, error: newSectionError } = await supabase
                  .from('inspection_form_sections')
                  .insert({
                    template_id: newTemplate.id,
                    title: section.title,
                    description: section.description,
                    display_order: section.display_order,
                  })
                  .select()
                  .single();

                if (newSectionError) throw newSectionError;
                sectionMapping[section.id] = newSection.id;
              }

              if (sourceItems.length > 0) {
                const newItems = sourceItems.map((item) => ({
                  section_id: sectionMapping[item.section_id],
                  item_name: item.item_name,
                  item_key: item.item_key,
                  item_type: item.item_type,
                  description: item.description,
                  is_required: item.is_required,
                  display_order: item.display_order,
                  default_value: item.default_value,
                  component_category: item.component_category,
                  linked_component_type: item.linked_component_type,
                  unit: item.unit,
                }));

                const { error: newItemsError } = await supabase
                  .from('inspection_form_items')
                  .insert(newItems);

                if (newItemsError) throw newItemsError;
              }
            }

            // Assign new template to equipment
            const { error: assignError } = await supabase
              .from('equipment_assets')
              .update({ inspection_template_id: newTemplate.id })
              .eq('id', eq.id);

            if (assignError) throw assignError;
          }
        } else {
          // For asset-specific templates: assign directly
          const { error: assignError } = await supabase
            .from('equipment_assets')
            .update({ inspection_template_id: templateId })
            .in('id', newlyAssigned);
          
          if (assignError) throw assignError;
        }
      }

      return { 
        assigned: newlyAssigned.length, 
        removed: toRemove.length,
        createdTemplates,
        isBaseTemplate,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-for-template-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-template-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-templates'] });
    },
  });
}
