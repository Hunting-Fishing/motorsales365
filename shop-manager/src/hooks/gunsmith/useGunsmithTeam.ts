import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GunsmithTeamMemberRole {
  id: string;
  role_id: string;
  role: {
    id: string;
    name: string;
    role_type: string | null;
  };
}

export interface GunsmithTeamMember {
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
    job_title: string | null;
  };
  role?: {
    id: string;
    name: string;
    role_type: string | null;
  };
  roles?: GunsmithTeamMemberRole[];
}

export function useGunsmithTeam() {
  return useQuery({
    queryKey: ['gunsmith-team'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_team_members')
        .select(`
          *,
          profile:profiles(id, first_name, last_name, email, phone, job_title),
          role:gunsmith_roles(id, name, role_type),
          roles:gunsmith_team_member_roles(
            id,
            role_id,
            role:gunsmith_roles(id, name, role_type)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GunsmithTeamMember[];
    },
  });
}

export function useAddGunsmithTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (member: {
      profile_id: string;
      role_id: string;
      hire_date?: string;
      notes?: string;
    }) => {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .limit(1)
        .single();
      
      const { data: teamMember, error } = await (supabase as any)
        .from('gunsmith_team_members')
        .insert({
          profile_id: member.profile_id,
          shop_id: shop?.id,
          is_active: true,
          hire_date: member.hire_date,
          notes: member.notes,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Add the role to the junction table
      const { error: roleError } = await (supabase as any)
        .from('gunsmith_team_member_roles')
        .insert({
          team_member_id: teamMember.id,
          role_id: member.role_id,
        });
      
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-team'] });
      toast.success('Team member added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add team member: ${error.message}`);
    },
  });
}

export function useUpdateGunsmithTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithTeamMember> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_team_members')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-team'] });
      toast.success('Team member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update team member: ${error.message}`);
    },
  });
}

export function useUpdateGunsmithTeamMemberProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ profileId, updates }: {
      profileId: string;
      updates: {
        first_name?: string;
        last_name?: string;
        phone?: string;
        job_title?: string;
      };
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-team'] });
      queryClient.invalidateQueries({ queryKey: ['profiles-for-team'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

export function useUpdateGunsmithTeamMemberRoles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamMemberId, roleIds }: {
      teamMemberId: string;
      roleIds: string[];
    }) => {
      // Delete all existing roles for this team member
      const { error: deleteError } = await (supabase as any)
        .from('gunsmith_team_member_roles')
        .delete()
        .eq('team_member_id', teamMemberId);
      
      if (deleteError) throw deleteError;

      // Insert new roles
      if (roleIds.length > 0) {
        const { error: insertError } = await (supabase as any)
          .from('gunsmith_team_member_roles')
          .insert(roleIds.map(roleId => ({
            team_member_id: teamMemberId,
            role_id: roleId,
          })));
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-team'] });
      toast.success('Roles updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update roles: ${error.message}`);
    },
  });
}

export function useRemoveGunsmithTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('gunsmith_team_members')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-team'] });
      toast.success('Team member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove team member: ${error.message}`);
    },
  });
}
