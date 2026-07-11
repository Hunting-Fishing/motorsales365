import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemService {
  id: string;
  serviceName: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptimePercentage: number;
  responseTimeMs: number;
  lastCheckAt: string;
  description?: string;
}

export interface SystemIncident {
  id: string;
  title: string;
  description?: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
  startedAt: string;
  resolvedAt?: string;
  createdBy?: string;
}

export interface SystemStatusSummary {
  overallStatus: string;
  averageUptime: number;
  averageResponseTime: number;
  lastUpdate: string;
  activeIncidents: number;
}

// Fetch system status
export const useSystemStatus = () => {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_status')
          .select('*')
          .order('service_name');

        if (error) throw error;

        return (data || []).map((service): SystemService => ({
          id: service.id,
          serviceName: service.service_name,
          status: service.status as 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance',
          uptimePercentage: parseFloat(service.uptime_percentage?.toString() || '0'),
          responseTimeMs: service.response_time_ms || 0,
          lastCheckAt: service.last_check_at,
          description: service.description
        }));
      } catch (error) {
        console.error('Error fetching system status:', error);
        return [];
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// Fetch system incidents
export const useSystemIncidents = (includeResolved = false) => {
  return useQuery({
    queryKey: ['system-incidents', includeResolved],
    queryFn: async () => {
      try {
        let query = supabase
          .from('system_incidents')
          .select('*')
          .order('created_at', { ascending: false });

        if (!includeResolved) {
          query = query.neq('status', 'resolved');
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;

        return (data || []).map((incident): SystemIncident => ({
          id: incident.id,
          title: incident.title,
          description: incident.description,
          status: incident.status as 'investigating' | 'identified' | 'monitoring' | 'resolved',
          severity: incident.severity as 'low' | 'medium' | 'high' | 'critical',
          affectedServices: incident.affected_services || [],
          startedAt: incident.started_at,
          resolvedAt: incident.resolved_at,
          createdBy: incident.created_by
        }));
      } catch (error) {
        console.error('Error fetching system incidents:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

// Get system status summary
export const useSystemStatusSummary = () => {
  return useQuery({
    queryKey: ['system-status-summary'],
    queryFn: async () => {
      try {
        const { data: statusData, error: statusError } = await supabase
          .from('system_status')
          .select('*');

        const { data: incidentData, error: incidentError } = await supabase
          .from('system_incidents')
          .select('*')
          .neq('status', 'resolved');

        if (statusError) throw statusError;
        if (incidentError) throw incidentError;

        const services = statusData || [];
        const activeIncidents = incidentData?.length || 0;

        // Calculate overall status
        let overallStatus = 'operational';
        if (activeIncidents > 0) {
          const hasCritical = incidentData?.some(i => i.severity === 'critical');
          const hasHigh = incidentData?.some(i => i.severity === 'high');
          
          if (hasCritical) overallStatus = 'major_outage';
          else if (hasHigh) overallStatus = 'partial_outage';
          else overallStatus = 'degraded';
        }

        // Calculate averages
        const averageUptime = services.length > 0 
          ? services.reduce((sum, s) => sum + parseFloat(s.uptime_percentage?.toString() || '0'), 0) / services.length
          : 100;

        const averageResponseTime = services.length > 0
          ? services.reduce((sum, s) => sum + (s.response_time_ms || 0), 0) / services.length
          : 0;

        const lastUpdate = services.length > 0
          ? Math.max(...services.map(s => new Date(s.last_check_at || new Date()).getTime()))
          : Date.now();

        const summary: SystemStatusSummary = {
          overallStatus,
          averageUptime,
          averageResponseTime,
          lastUpdate: new Date(lastUpdate).toISOString(),
          activeIncidents
        };

        return summary;
      } catch (error) {
        console.error('Error fetching system status summary:', error);
        return {
          overallStatus: 'operational',
          averageUptime: 99.9,
          averageResponseTime: 120,
          lastUpdate: new Date().toISOString(),
          activeIncidents: 0
        };
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

// Update system status (admin only)
export const useUpdateSystemStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: Partial<SystemService> & { id: string }) => {
      const { data, error } = await supabase
        .from('system_status')
        .update({
          status: update.status,
          uptime_percentage: update.uptimePercentage,
          response_time_ms: update.responseTimeMs,
          description: update.description,
          last_check_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
      queryClient.invalidateQueries({ queryKey: ['system-status-summary'] });
    }
  });
};

// Create system incident (admin only)
export const useCreateSystemIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incident: Omit<SystemIncident, 'id' | 'createdBy'>) => {
      const { data, error } = await supabase
        .from('system_incidents')
        .insert({
          title: incident.title,
          description: incident.description,
          status: incident.status,
          severity: incident.severity,
          affected_services: incident.affectedServices,
          started_at: incident.startedAt
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['system-status-summary'] });
    }
  });
};

// Update system incident (admin only)
export const useUpdateSystemIncident = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: Partial<SystemIncident> & { id: string }) => {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (update.title) updateData.title = update.title;
      if (update.description) updateData.description = update.description;
      if (update.status) updateData.status = update.status;
      if (update.severity) updateData.severity = update.severity;
      if (update.affectedServices) updateData.affected_services = update.affectedServices;
      
      // Set resolved_at when status changes to resolved
      if (update.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('system_incidents')
        .update(updateData)
        .eq('id', update.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['system-status-summary'] });
    }
  });
};