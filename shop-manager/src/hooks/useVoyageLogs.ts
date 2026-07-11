import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VoyageLog, VoyageCommunicationLog } from '@/types/voyage';
import { toast } from 'sonner';

export function useVoyageLogs() {
  const queryClient = useQueryClient();

  const voyageLogsQuery = useQuery({
    queryKey: ['voyage-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voyage_logs')
        .select(`
          *,
          vessel:equipment_assets!voyage_logs_vessel_id_fkey(id, name, unit_number)
        `)
        .order('departure_datetime', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as VoyageLog[];
    }
  });

  const activeVoyageQuery = useQuery({
    queryKey: ['voyage-logs', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voyage_logs')
        .select(`
          *,
          vessel:equipment_assets!voyage_logs_vessel_id_fkey(id, name, unit_number)
        `)
        .eq('voyage_status', 'in_progress')
        .order('departure_datetime', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as VoyageLog | null;
    }
  });

  const createVoyageMutation = useMutation({
    mutationFn: async (voyage: Partial<VoyageLog>) => {
      // Generate voyage number
      const { data: lastVoyage } = await supabase
        .from('voyage_logs')
        .select('voyage_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastVoyage?.voyage_number) {
        const match = lastVoyage.voyage_number.match(/VL-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }
      const voyageNumber = `VL-${String(nextNumber).padStart(4, '0')}`;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user?.id)
        .single();

      const { data, error } = await supabase
        .from('voyage_logs')
        .insert({
          voyage_number: voyageNumber,
          shop_id: profile?.shop_id,
          entered_by: user?.id,
          voyage_status: 'in_progress' as const,
          departure_datetime: voyage.departure_datetime,
          origin_location: voyage.origin_location,
          destination_location: voyage.destination_location,
          master_name: voyage.master_name,
          vessel_id: voyage.vessel_id,
          voyage_type: voyage.voyage_type,
          cargo_description: voyage.cargo_description,
          barge_name: voyage.barge_name,
          cargo_weight: voyage.cargo_weight,
          engine_hours_start: voyage.engine_hours_start,
          fuel_start: voyage.fuel_start,
          crew_members: JSON.parse(JSON.stringify(voyage.crew_members || [])),
          activity_log: JSON.parse(JSON.stringify(voyage.activity_log || []))
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voyage-logs'] });
      toast.success('Voyage started successfully');
    },
    onError: (error) => {
      toast.error('Failed to start voyage: ' + error.message);
    }
  });

  const updateVoyageMutation = useMutation({
    mutationFn: async ({ id, activity_log, incidents, ...updates }: Partial<VoyageLog> & { id: string }) => {
      const updatePayload: Record<string, unknown> = { ...updates };
      
      if (activity_log !== undefined) {
        updatePayload.activity_log = JSON.parse(JSON.stringify(activity_log));
      }
      if (incidents !== undefined) {
        updatePayload.incidents = JSON.parse(JSON.stringify(incidents));
        updatePayload.has_incidents = incidents.length > 0;
      }

      const { data, error } = await supabase
        .from('voyage_logs')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voyage-logs'] });
      toast.success('Voyage updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update voyage: ' + error.message);
    }
  });

  const endVoyageMutation = useMutation({
    mutationFn: async ({ id, arrival_datetime, engine_hours_end, fuel_end, master_signature, notes }: {
      id: string;
      arrival_datetime: string;
      engine_hours_end?: number;
      fuel_end?: number;
      master_signature?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('voyage_logs')
        .update({
          arrival_datetime,
          engine_hours_end,
          fuel_end,
          master_signature,
          notes,
          voyage_status: 'completed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voyage-logs'] });
      toast.success('Voyage completed successfully');
    },
    onError: (error) => {
      toast.error('Failed to end voyage: ' + error.message);
    }
  });

  return {
    voyageLogs: voyageLogsQuery.data || [],
    activeVoyage: activeVoyageQuery.data,
    isLoading: voyageLogsQuery.isLoading,
    isLoadingActive: activeVoyageQuery.isLoading,
    createVoyage: createVoyageMutation.mutateAsync,
    updateVoyage: updateVoyageMutation.mutateAsync,
    endVoyage: endVoyageMutation.mutateAsync,
    isCreating: createVoyageMutation.isPending,
    isUpdating: updateVoyageMutation.isPending,
    isEnding: endVoyageMutation.isPending
  };
}

export function useVoyageCommunications(voyageId: string | undefined) {
  const queryClient = useQueryClient();

  const communicationsQuery = useQuery({
    queryKey: ['voyage-communications', voyageId],
    queryFn: async () => {
      if (!voyageId) return [];
      const { data, error } = await supabase
        .from('voyage_communication_logs')
        .select('*')
        .eq('voyage_id', voyageId)
        .order('communication_time', { ascending: false });
      
      if (error) throw error;
      return data as VoyageCommunicationLog[];
    },
    enabled: !!voyageId
  });

  const addCommunicationMutation = useMutation({
    mutationFn: async (comm: Partial<VoyageCommunicationLog>) => {
      const { data, error } = await supabase
        .from('voyage_communication_logs')
        .insert({
          voyage_id: comm.voyage_id!,
          communication_time: comm.communication_time,
          channel: comm.channel,
          contact_station: comm.contact_station,
          call_type: comm.call_type,
          direction: comm.direction,
          message_summary: comm.message_summary
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voyage-communications', voyageId] });
      toast.success('Communication logged');
    },
    onError: (error) => {
      toast.error('Failed to log communication: ' + error.message);
    }
  });

  return {
    communications: communicationsQuery.data || [],
    isLoading: communicationsQuery.isLoading,
    addCommunication: addCommunicationMutation.mutateAsync,
    isAdding: addCommunicationMutation.isPending
  };
}
