import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface VesselEquipment {
  id: string;
  name: string;
  asset_number: string | null;
  equipment_type: string | null;
  current_hours: number | null;
  parent_equipment_id: string | null;
  location?: string | null;
}

export interface InspectionTemplate {
  id: string;
  equipment_type: string;
  category: string;
  item_name: string;
  item_key: string;
  description: string | null;
  display_order: number;
  is_required: boolean;
}

export interface InspectionItemStatus {
  templateId: string;
  equipmentId: string | null;
  itemKey: string;
  itemName: string;
  category: string;
  status: 'good' | 'attention' | 'bad' | 'na' | null;
  notes: string;
  location?: string;
  hoursAtInspection?: number;
}

export interface VesselInspectionData {
  vesselId: string;
  inspectorName: string;
  currentHours: number | null;
  overallStatus: 'pending' | 'pass' | 'fail' | 'attention';
  safeToOperate: boolean;
  generalNotes: string;
  signatureData?: string;
  workOrderId?: string;
  items: InspectionItemStatus[];
}

export function useVesselInspection() {
  const queryClient = useQueryClient();
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  // Fetch vessels (parent equipment with no parent_equipment_id or type = vessel)
  const { data: vessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ['vessels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number, equipment_type, current_hours, parent_equipment_id')
        .or('parent_equipment_id.is.null,equipment_type.eq.vessel')
        .order('name');
      
      if (error) throw error;
      return data as VesselEquipment[];
    }
  });

  // Fetch child equipment for selected vessel
  const { data: childEquipment, isLoading: childEquipmentLoading } = useQuery({
    queryKey: ['vessel-equipment', selectedVesselId],
    queryFn: async () => {
      if (!selectedVesselId) return [];
      
      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, asset_number, equipment_type, current_hours, parent_equipment_id')
        .eq('parent_equipment_id', selectedVesselId)
        .order('equipment_type, name');
      
      if (error) throw error;

      // Also fetch locations for these equipment
      const equipmentIds = data.map(e => e.id);
      if (equipmentIds.length > 0) {
        const { data: locations } = await supabase
          .from('equipment_locations')
          .select('equipment_id, location_name')
          .eq('parent_equipment_id', selectedVesselId)
          .in('equipment_id', equipmentIds);

        const locationMap = new Map(locations?.map(l => [l.equipment_id, l.location_name]) || []);
        return data.map(e => ({
          ...e,
          location: locationMap.get(e.id) || null
        })) as VesselEquipment[];
      }

      return data as VesselEquipment[];
    },
    enabled: !!selectedVesselId
  });

  // Fetch inspection templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['vessel-inspection-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vessel_inspection_templates')
        .select('*')
        .eq('is_active', true)
        .order('equipment_type, display_order');
      
      if (error) throw error;
      return data as InspectionTemplate[];
    }
  });

  // Get templates for a specific equipment type
  const getTemplatesForType = useCallback((equipmentType: string) => {
    return templates?.filter(t => t.equipment_type === equipmentType) || [];
  }, [templates]);

  // Fetch last inspection for vessel
  const { data: lastInspection } = useQuery({
    queryKey: ['last-vessel-inspection', selectedVesselId],
    queryFn: async () => {
      if (!selectedVesselId) return null;

      const { data, error } = await supabase
        .from('vessel_inspections')
        .select(`
          *,
          vessel_inspection_items (*)
        `)
        .eq('vessel_id', selectedVesselId)
        .order('inspection_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedVesselId
  });

  // Create inspection mutation
  const createInspection = useMutation({
    mutationFn: async (data: VesselInspectionData) => {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .single();

      // Check for concerns
      const hasConcerns = data.items.some(item => 
        item.status === 'attention' || item.status === 'bad'
      );

      // Calculate overall status
      let overallStatus = 'pass';
      if (data.items.some(item => item.status === 'bad')) {
        overallStatus = 'fail';
      } else if (data.items.some(item => item.status === 'attention')) {
        overallStatus = 'attention';
      }

      // Find concern role to route to if there are concerns (same as forklift)
      let concernRoutedTo = null;
      if (hasConcerns && profile?.shop_id) {
        const { data: roles } = await supabase
          .from('inspection_concern_roles')
          .select('assigned_user_id')
          .eq('shop_id', profile.shop_id)
          .eq('is_active', true)
          .order('priority_level', { ascending: true })
          .limit(1);
        
        if (roles && roles.length > 0) {
          concernRoutedTo = roles[0].assigned_user_id;
        }
      }

      // Create main inspection record
      const { data: inspection, error: inspectionError } = await supabase
        .from('vessel_inspections')
        .insert({
          shop_id: profile?.shop_id,
          vessel_id: data.vesselId,
          inspector_id: user.id,
          inspector_name: data.inspectorName,
          current_hours: data.currentHours,
          overall_status: overallStatus,
          safe_to_operate: data.safeToOperate,
          general_notes: data.generalNotes,
          signature_data: data.signatureData,
          has_concerns: hasConcerns,
          concern_routed_to: concernRoutedTo,
          work_order_id: data.workOrderId || null
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      // Update vessel's current hours (same as forklift form does)
      if (data.currentHours !== null) {
        await supabase
          .from('equipment_assets')
          .update({ 
            current_hours: data.currentHours,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.vesselId);
      }

      // Create inspection items
      const itemsToInsert = data.items
        .filter(item => item.status !== null)
        .map(item => ({
          inspection_id: inspection.id,
          equipment_id: item.equipmentId,
          template_id: item.templateId,
          item_key: item.itemKey,
          item_name: item.itemName,
          category: item.category,
          status: item.status,
          notes: item.notes || null,
          location: item.location || null,
          hours_at_inspection: item.hoursAtInspection || null
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('vessel_inspection_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return inspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vessel-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['last-vessel-inspection'] });
      toast({
        title: 'Inspection Saved',
        description: 'Vessel inspection has been recorded successfully.'
      });
    },
    onError: (error) => {
      console.error('Error saving inspection:', error);
      toast({
        title: 'Error',
        description: 'Failed to save inspection. Please try again.',
        variant: 'destructive'
      });
    }
  });

  return {
    vessels,
    vesselsLoading,
    selectedVesselId,
    setSelectedVesselId,
    childEquipment,
    childEquipmentLoading,
    templates,
    templatesLoading,
    getTemplatesForType,
    lastInspection,
    createInspection,
    isSubmitting: createInspection.isPending
  };
}
