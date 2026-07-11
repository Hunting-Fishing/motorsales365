import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type SuccessStory = Database['public']['Tables']['success_stories']['Row'];
type CreateSuccessStory = Database['public']['Tables']['success_stories']['Insert'];
type UpdateSuccessStory = Database['public']['Tables']['success_stories']['Update'];

export const successStoriesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching success stories:', error);
      return [];
    }
    return data || [];
  },

  async getFeatured() {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*')
      .eq('featured', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching featured stories:', error);
      return [];
    }
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('success_stories')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(story: CreateSuccessStory) {
    const { data, error } = await supabase
      .from('success_stories')
      .insert(story)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: UpdateSuccessStory) {
    const { data, error } = await supabase
      .from('success_stories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('success_stories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};