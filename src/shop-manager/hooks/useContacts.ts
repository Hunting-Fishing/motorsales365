import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact, ContactCategory, Resource, ContactFormData, ResourceFormData } from '@/types/contacts';
import { toast } from 'sonner';

const DEFAULT_SHOP_ID = '00000000-0000-0000-0000-000000000000';

// Categories
export function useContactCategories() {
  return useQuery({
    queryKey: ['contact-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as ContactCategory[];
    }
  });
}

// Contacts
export function useContacts(categoryId?: string | null) {
  return useQuery({
    queryKey: ['contacts', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*, category:contact_categories(*)')
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('company_name')
        .order('last_name');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    }
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contact: Partial<ContactFormData>) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contact,
          shop_id: DEFAULT_SHOP_ID,
          tags: contact.tags || []
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create contact');
      console.error(error);
    }
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...contact }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...contact, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact updated');
    },
    onError: (error) => {
      toast.error('Failed to update contact');
      console.error(error);
    }
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete contact');
      console.error(error);
    }
  });
}

// Resources
export function useResources(categoryId?: string | null) {
  return useQuery({
    queryKey: ['resources', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('resources')
        .select('*, category:contact_categories(*)')
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('name');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Resource[];
    }
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (resource: Partial<ResourceFormData>) => {
      const insertData = {
        name: resource.name || '',
        resource_type: resource.resource_type || 'website',
        shop_id: DEFAULT_SHOP_ID,
        category_id: resource.category_id || null,
        description: resource.description || null,
        url: resource.url || null,
        username: resource.username || null,
        notes: resource.notes || null,
        tags: resource.tags || [],
        is_favorite: resource.is_favorite || false,
        is_active: resource.is_active !== false,
      };
      
      const { data, error } = await supabase
        .from('resources')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create resource');
      console.error(error);
    }
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...resource }: Partial<Resource> & { id: string }) => {
      const { data, error } = await supabase
        .from('resources')
        .update({ ...resource, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource updated');
    },
    onError: (error) => {
      toast.error('Failed to update resource');
      console.error(error);
    }
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete resource');
      console.error(error);
    }
  });
}

// Toggle favorite
export function useToggleContactFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('contacts')
        .update({ is_favorite })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  });
}

export function useToggleResourceFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('resources')
        .update({ is_favorite })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  });
}

// Track resource access
export function useTrackResourceAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First get current access count
      const { data: current } = await supabase
        .from('resources')
        .select('access_count')
        .eq('id', id)
        .single();
      
      const { error } = await supabase
        .from('resources')
        .update({ 
          last_accessed_at: new Date().toISOString(),
          access_count: (current?.access_count || 0) + 1
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  });
}
