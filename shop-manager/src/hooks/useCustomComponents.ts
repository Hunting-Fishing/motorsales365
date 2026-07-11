import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomComponent {
  id: string;
  shop_id: string | null;
  name: string;
  key: string;
  type: 'hour_meter' | 'fluid_level' | 'gyr_status' | 'checkbox' | 'number' | 'text';
  category: string;
  description: string | null;
  unit: string | null;
  linked_equipment_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomComponentInput {
  name: string;
  key: string;
  type: CustomComponent['type'];
  category: string;
  description?: string;
  unit?: string;
  linked_equipment_type?: string;
}

export function useCustomComponents() {
  return useQuery({
    queryKey: ['custom-components'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_component_definitions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching custom components:', error);
        throw error;
      }

      return data as CustomComponent[];
    },
  });
}

export function useCreateCustomComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCustomComponentInput) => {
      // Get current user's shop_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .single();

      if (!profile?.shop_id) throw new Error('No shop found for user');

      const { data, error } = await supabase
        .from('custom_component_definitions')
        .insert({
          shop_id: profile.shop_id,
          name: input.name,
          key: input.key,
          type: input.type,
          category: input.category,
          description: input.description || null,
          unit: input.unit || null,
          linked_equipment_type: input.linked_equipment_type || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating custom component:', error);
        throw error;
      }

      return data as CustomComponent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-components'] });
      toast.success('Custom component added successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create custom component:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('A component with this key already exists');
      } else {
        toast.error('Failed to add custom component');
      }
    },
  });
}

export function useDeleteCustomComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (componentId: string) => {
      const { error } = await supabase
        .from('custom_component_definitions')
        .delete()
        .eq('id', componentId);

      if (error) {
        console.error('Error deleting custom component:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-components'] });
      toast.success('Custom component deleted');
    },
    onError: (error: Error) => {
      console.error('Failed to delete custom component:', error);
      toast.error('Failed to delete custom component');
    },
  });
}
