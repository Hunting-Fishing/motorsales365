import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PowerWashingTeamMember {
  id: string;
  shop_id: string;
  profile_id: string;
  role_id: string | null;
  is_active: boolean;
  hire_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  role?: {
    id: string;
    name: string;
  };
  certificates?: PowerWashingTeamCertificate[];
}

export interface PowerWashingTeamCertificate {
  id: string;
  certificate_type_id: string;
  issued_date: string;
  expiry_date: string | null;
  certificate_number: string | null;
  certificate_type?: {
    id: string;
    name: string;
    is_required: boolean;
  };
}

export interface CreateTeamMemberInput {
  profile_id: string;
  role_id?: string;
  hire_date?: string;
  notes?: string;
}

export interface UpdateTeamMemberInput {
  role_id?: string | null;
  is_active?: boolean;
  hire_date?: string | null;
  notes?: string | null;
}

export function usePowerWashingTeam(shopId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const teamQuery = useQuery({
    queryKey: ['power-washing-team', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_team_members')
        .select(`
          *,
          profile:profiles(id, first_name, last_name, email, phone),
          role:power_washing_roles(id, name)
        `)
        .eq('shop_id', shopId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PowerWashingTeamMember[];
    },
    enabled: !!shopId,
  });

  const teamWithCertificatesQuery = useQuery({
    queryKey: ['power-washing-team-certificates', shopId],
    queryFn: async () => {
      const { data: teamData, error: teamError } = await supabase
        .from('power_washing_team_members')
        .select(`
          *,
          profile:profiles(id, first_name, last_name, email, phone),
          role:power_washing_roles(id, name)
        `)
        .eq('shop_id', shopId!)
        .order('created_at', { ascending: false });

      if (teamError) throw teamError;

      // Fetch certificates for each team member
      const teamWithCerts = await Promise.all(
        (teamData || []).map(async (member) => {
          const { data: certs } = await supabase
            .from('power_washing_team_certificates')
            .select(`
              *,
              certificate_type:power_washing_certificate_types(id, name, is_required)
            `)
            .eq('team_member_id', member.id);

          return {
            ...member,
            certificates: certs || [],
          };
        })
      );

      return teamWithCerts as unknown as PowerWashingTeamMember[];
    },
    enabled: !!shopId,
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: async (input: CreateTeamMemberInput) => {
      const { data, error } = await supabase
        .from('power_washing_team_members')
        .insert({
          shop_id: shopId!,
          profile_id: input.profile_id,
          role_id: input.role_id || null,
          hire_date: input.hire_date || null,
          notes: input.notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-team', shopId] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-team-certificates', shopId] });
      toast({ title: 'Team member added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add team member', description: error.message, variant: 'destructive' });
    },
  });

  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateTeamMemberInput & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_team_members')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-team', shopId] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-team-certificates', shopId] });
      toast({ title: 'Team member updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update team member', description: error.message, variant: 'destructive' });
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-team', shopId] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-team-certificates', shopId] });
      toast({ title: 'Team member removed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove team member', description: error.message, variant: 'destructive' });
    },
  });

  const deactivateTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_team_members')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-team', shopId] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-team-certificates', shopId] });
      toast({ title: 'Team member deactivated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to deactivate team member', description: error.message, variant: 'destructive' });
    },
  });

  const reactivateTeamMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_team_members')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-team', shopId] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-team-certificates', shopId] });
      toast({ title: 'Team member reactivated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to reactivate team member', description: error.message, variant: 'destructive' });
    },
  });

  return {
    team: teamQuery.data || [],
    teamWithCertificates: teamWithCertificatesQuery.data || [],
    isLoading: teamQuery.isLoading,
    isLoadingWithCertificates: teamWithCertificatesQuery.isLoading,
    error: teamQuery.error,
    refetch: teamQuery.refetch,
    addTeamMember: addTeamMemberMutation.mutateAsync,
    updateTeamMember: updateTeamMemberMutation.mutateAsync,
    removeTeamMember: removeTeamMemberMutation.mutateAsync,
    deactivateTeamMember: deactivateTeamMemberMutation.mutateAsync,
    reactivateTeamMember: reactivateTeamMemberMutation.mutateAsync,
    isAdding: addTeamMemberMutation.isPending,
    isUpdating: updateTeamMemberMutation.isPending,
    isRemoving: removeTeamMemberMutation.isPending,
  };
}
