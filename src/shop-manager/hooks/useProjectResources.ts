import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ProjectResourceAssignment, ResourceType } from '@/types/projectResource';

export function useProjectResources(projectId?: string) {
  const queryClient = useQueryClient();

  const { data: resources, isLoading, refetch } = useQuery({
    queryKey: ['project-resources', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await (supabase as any)
        .from('project_resource_assignments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProjectResourceAssignment[];
    },
    enabled: !!projectId,
  });

  const createResource = useMutation({
    mutationFn: async (resource: Partial<ProjectResourceAssignment>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .single();

      const { data, error } = await (supabase as any)
        .from('project_resource_assignments')
        .insert({
          project_id: projectId,
          phase_id: resource.phase_id,
          resource_type: resource.resource_type,
          resource_id: resource.resource_id,
          resource_name: resource.resource_name,
          role: resource.role,
          planned_hours: resource.planned_hours || 0,
          planned_cost: resource.planned_cost || 0,
          hourly_rate: resource.hourly_rate,
          start_date: resource.start_date,
          end_date: resource.end_date,
          is_full_time: resource.is_full_time || false,
          allocation_percent: resource.allocation_percent || 100,
          notes: resource.notes,
          shop_id: profile?.shop_id,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast.success('Resource assigned');
    },
    onError: (error: any) => {
      toast.error(`Failed to assign resource: ${error.message}`);
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProjectResourceAssignment> }) => {
      const { data, error } = await (supabase as any)
        .from('project_resource_assignments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast.success('Resource updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update resource: ${error.message}`);
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('project_resource_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-resources', projectId] });
      toast.success('Resource removed');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove resource: ${error.message}`);
    },
  });

  // Group resources by type
  const staffResources = resources?.filter(r => r.resource_type === 'employee') || [];
  const equipmentResources = resources?.filter(r => r.resource_type === 'equipment' || r.resource_type === 'vessel' || r.resource_type === 'vehicle') || [];

  return {
    resources,
    staffResources,
    equipmentResources,
    isLoading,
    refetch,
    createResource,
    updateResource,
    deleteResource,
  };
}

// Hook to get all resources across all projects for capacity planning
export function useAllProjectResources() {
  const { data: resources, isLoading } = useQuery({
    queryKey: ['all-project-resources'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_resource_assignments')
        .select(`
          *,
          project:project_budgets(id, project_name, status),
          phase:project_phases(id, phase_name)
        `)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return { resources, isLoading };
}

// Hook to get projects for timeline view
export function useProjectsTimeline() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects-timeline'],
    queryFn: async () => {
      const { data: projects, error: projectsError } = await supabase
        .from('project_budgets')
        .select('*')
        .neq('status', 'cancelled')
        .order('planned_start_date', { ascending: true });

      if (projectsError) throw projectsError;

      const { data: phases, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .order('phase_order', { ascending: true });

      if (phasesError) throw phasesError;

      return { projects, phases };
    },
  });

  return {
    projects: data?.projects || [],
    phases: data?.phases || [],
    isLoading,
  };
}
