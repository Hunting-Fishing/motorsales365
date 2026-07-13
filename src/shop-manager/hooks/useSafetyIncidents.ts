import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { SafetyIncident, IncidentType, IncidentSeverity, InvestigationStatus, InjuredPersonType } from '@/types/safety';

interface CreateIncidentData {
  incident_date: string;
  incident_time?: string;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  location: string;
  title: string;
  description: string;
  equipment_id?: string;
  vehicle_id?: string;
  injured_person_name?: string;
  injured_person_type?: InjuredPersonType;
  injury_details?: string;
  medical_treatment_required?: boolean;
  medical_treatment_description?: string;
  osha_reportable?: boolean;
}

export function useSafetyIncidents() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchIncidents();
    }
  }, [shopId]);

  const fetchIncidents = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('safety_incidents' as any)
        .select('*')
        .eq('shop_id', shopId)
        .order('incident_date', { ascending: false }) as any);

      if (error) throw error;
      setIncidents((data || []) as SafetyIncident[]);
    } catch (error: any) {
      console.error('Error fetching safety incidents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load safety incidents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createIncident = async (data: CreateIncidentData) => {
    if (!shopId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: incident, error } = await (supabase
        .from('safety_incidents' as any)
        .insert({
          shop_id: shopId,
          reported_by: userData.user.id,
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchIncidents();
      toast({
        title: 'Success',
        description: 'Incident reported successfully'
      });
      
      return incident;
    } catch (error: any) {
      console.error('Error creating incident:', error);
      toast({
        title: 'Error',
        description: 'Failed to report incident',
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateIncidentStatus = async (
    incidentId: string, 
    status: InvestigationStatus,
    updates?: { corrective_actions?: string; preventive_measures?: string; root_cause?: string }
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const updateData: any = {
        investigation_status: status,
        ...updates
      };

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = userData.user?.id;
      }

      const { error } = await (supabase
        .from('safety_incidents' as any)
        .update(updateData)
        .eq('id', incidentId) as any);

      if (error) throw error;
      
      await fetchIncidents();
      toast({
        title: 'Success',
        description: 'Incident status updated'
      });
    } catch (error: any) {
      console.error('Error updating incident:', error);
      toast({
        title: 'Error',
        description: 'Failed to update incident',
        variant: 'destructive'
      });
    }
  };

  return {
    loading,
    incidents,
    createIncident,
    updateIncidentStatus,
    refetch: fetchIncidents
  };
}
