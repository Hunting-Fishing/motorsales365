import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PowerWashingRole {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  permissions: Record<string, string[]>;
  is_system: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: Record<string, string[]>;
  display_order?: number;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: Record<string, string[]>;
  display_order?: number;
}

export function usePowerWashingRoles(shopId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['power-washing-roles', shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_roles')
        .select('*')
        .eq('shop_id', shopId!)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as PowerWashingRole[];
    },
    enabled: !!shopId,
  });

  const createRoleMutation = useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      const { data, error } = await supabase
        .from('power_washing_roles')
        .insert({
          shop_id: shopId!,
          name: input.name,
          description: input.description || null,
          permissions: input.permissions || {},
          display_order: input.display_order || 0,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PowerWashingRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-roles', shopId] });
      toast({ title: 'Role created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create role', description: error.message, variant: 'destructive' });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateRoleInput & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_roles')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PowerWashingRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-roles', shopId] });
      toast({ title: 'Role updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update role', description: error.message, variant: 'destructive' });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_roles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-roles', shopId] });
      toast({ title: 'Role deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete role', description: error.message, variant: 'destructive' });
    },
  });

  const seedDefaultRolesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_power_washing_roles_for_shop', {
        p_shop_id: shopId!,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-roles', shopId] });
      toast({ title: 'Default roles created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create default roles', description: error.message, variant: 'destructive' });
    },
  });

  return {
    roles: rolesQuery.data || [],
    isLoading: rolesQuery.isLoading,
    error: rolesQuery.error,
    refetch: rolesQuery.refetch,
    createRole: createRoleMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    deleteRole: deleteRoleMutation.mutateAsync,
    seedDefaultRoles: seedDefaultRolesMutation.mutateAsync,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    isDeleting: deleteRoleMutation.isPending,
  };
}
