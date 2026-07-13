import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ItemStatus = 'good' | 'attention' | 'bad' | 'na' | null;
export type OverallStatus = 'pass' | 'pass_with_concerns' | 'fail';

export interface ForkliftInspection {
  id: string;
  shop_id: string;
  equipment_id: string;
  inspector_id: string | null;
  inspector_name: string;
  inspection_date: string;
  current_hours: number;
  
  // Inspection items
  seat_status: ItemStatus;
  seat_notes?: string;
  seatbelt_status: ItemStatus;
  seatbelt_notes?: string;
  steering_status: ItemStatus;
  steering_notes?: string;
  horn_status: ItemStatus;
  horn_notes?: string;
  lights_status: ItemStatus;
  lights_notes?: string;
  backup_alarm_status: ItemStatus;
  backup_alarm_notes?: string;
  mirrors_status: ItemStatus;
  mirrors_notes?: string;
  forks_status: ItemStatus;
  forks_notes?: string;
  mast_status: ItemStatus;
  mast_notes?: string;
  chains_status: ItemStatus;
  chains_notes?: string;
  hydraulic_leaks_status: ItemStatus;
  hydraulic_leaks_notes?: string;
  tires_status: ItemStatus;
  tires_notes?: string;
  brakes_status: ItemStatus;
  brakes_notes?: string;
  parking_brake_status: ItemStatus;
  parking_brake_notes?: string;
  battery_status: ItemStatus;
  battery_notes?: string;
  propane_tank_status: ItemStatus;
  propane_tank_notes?: string;
  engine_oil_status: ItemStatus;
  engine_oil_notes?: string;
  coolant_status: ItemStatus;
  coolant_notes?: string;
  air_filter_status: ItemStatus;
  air_filter_notes?: string;
  fire_extinguisher_status: ItemStatus;
  fire_extinguisher_notes?: string;
  
  overall_status: OverallStatus;
  safe_to_operate: boolean;
  general_notes?: string;
  signature_data?: string;
  has_concerns: boolean;
  concern_routed_to?: string;
  concern_acknowledged?: boolean;
  concern_acknowledged_at?: string;
  concern_resolution?: string;
  concern_resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateForkliftInspectionInput {
  equipment_id: string;
  inspector_name: string;
  current_hours: number;
  [key: string]: any;
}

export interface InspectionConcernRole {
  id: string;
  shop_id: string;
  role_name: string;
  role_description?: string;
  assigned_user_id?: string;
  equipment_types: string[];
  priority_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_user?: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

export function useForkliftInspections(equipmentId?: string) {
  const [inspections, setInspections] = useState<ForkliftInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchInspections = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('forklift_inspections')
        .select('*')
        .order('inspection_date', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInspections((data || []) as ForkliftInspection[]);
    } catch (error) {
      console.error('Error fetching forklift inspections:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load forklift inspections',
      });
    } finally {
      setLoading(false);
    }
  }, [equipmentId, toast]);

  const createInspection = useCallback(async (inspectionData: CreateForkliftInspectionInput) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop found');

      // Determine if there are concerns (any item not 'good')
      const statusFields = Object.keys(inspectionData).filter(k => k.endsWith('_status'));
      const hasConcerns = statusFields.some(field => inspectionData[field] !== 'good');

      // Find concern role to route to if there are concerns
      let concernRoutedTo = null;
      if (hasConcerns) {
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

      const { data, error } = await supabase
        .from('forklift_inspections')
        .insert([{
          ...inspectionData,
          shop_id: profile.shop_id,
          inspector_id: user.id,
          has_concerns: hasConcerns,
          concern_routed_to: concernRoutedTo,
        }])
        .select()
        .single();

      if (error) throw error;

      // Update equipment's current hours
      await supabase
        .from('equipment_assets')
        .update({ 
          current_hours: inspectionData.current_hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', inspectionData.equipment_id);

      toast({
        title: 'Success',
        description: 'Forklift inspection submitted',
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

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  return {
    inspections,
    loading,
    fetchInspections,
    createInspection,
  };
}

export function useInspectionConcernRoles() {
  const [roles, setRoles] = useState<InspectionConcernRole[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) return;

      const { data, error } = await supabase
        .from('inspection_concern_roles')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('priority_level', { ascending: true });

      if (error) throw error;
      
      // Fetch user details separately for assigned users
      const rolesWithUsers = await Promise.all(
        (data || []).map(async (role) => {
          if (role.assigned_user_id) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .eq('id', role.assigned_user_id)
              .maybeSingle();
            return { ...role, assigned_user: userProfile } as InspectionConcernRole;
          }
          return role as InspectionConcernRole;
        })
      );
      
      setRoles(rolesWithUsers);
    } catch (error) {
      console.error('Error fetching concern roles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRole = useCallback(async (roleData: { role_name: string; role_description?: string; assigned_user_id?: string; equipment_types?: string[]; priority_level?: number }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('No shop found');

      const { error } = await supabase
        .from('inspection_concern_roles')
        .insert([{
          ...roleData,
          shop_id: profile.shop_id,
        }]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Concern role created' });
      await fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create role',
      });
    }
  }, [fetchRoles, toast]);

  const updateRole = useCallback(async (id: string, updates: Partial<InspectionConcernRole>) => {
    try {
      const { error } = await supabase
        .from('inspection_concern_roles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Role updated' });
      await fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update role',
      });
    }
  }, [fetchRoles, toast]);

  const deleteRole = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inspection_concern_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Role deleted' });
      await fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete role',
      });
    }
  }, [fetchRoles, toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    loading,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
}
