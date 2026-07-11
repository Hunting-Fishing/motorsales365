import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GunsmithRole {
  id: string;
  shop_id: string | null;
  name: string;
  role_type: string | null;
  description: string | null;
  permissions: Record<string, string[]>;
  is_system: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useGunsmithRoles() {
  return useQuery({
    queryKey: ['gunsmith-roles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_roles')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as GunsmithRole[];
    },
  });
}

export function useCreateGunsmithRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (role: Partial<GunsmithRole>) => {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .limit(1)
        .single();
      
      const { error } = await (supabase as any)
        .from('gunsmith_roles')
        .insert({
          ...role,
          shop_id: shop?.id,
          is_system: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
}

export function useUpdateGunsmithRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithRole> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_roles')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

export function useDeleteGunsmithRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('gunsmith_roles')
        .delete()
        .eq('id', id)
        .eq('is_system', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });
}
