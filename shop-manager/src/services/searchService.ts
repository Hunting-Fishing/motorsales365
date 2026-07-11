
import { supabase } from "@/integrations/supabase/client";
import { SavedSearch } from "@/types/document";
import { SearchResult } from "@/utils/search/types";

// Save a search query
export const saveSavedSearch = async (
  name: string, 
  searchQuery: Record<string, any>,
  description?: string,
  isGlobal: boolean = false
): Promise<SavedSearch | null> => {
  try {
    const { data, error } = await supabase
      .from('saved_searches' as any)
      .insert([
        {
          name,
          description,
          search_query: searchQuery,
          user_id: 'current-user', // In a real app, this would be auth.uid()
          is_global: isGlobal
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as SavedSearch;
  } catch (error) {
    console.error("Error saving search:", error);
    return null;
  }
};

// Get all saved searches for the current user
export const getSavedSearches = async (): Promise<SavedSearch[]> => {
  try {
    // In a real app with auth, this would include WHERE user_id = auth.uid() OR is_global = true
    const { data, error } = await supabase
      .from('saved_searches' as any)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as unknown as SavedSearch[];
  } catch (error) {
    console.error("Error fetching saved searches:", error);
    return [];
  }
};

// Delete a saved search
export const deleteSavedSearch = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('saved_searches' as any)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting saved search:", error);
    return false;
  }
};

// Track search analytics
export const trackSearch = async (
  query: string, 
  filters?: Record<string, any>,
  resultCount?: number
): Promise<void> => {
  try {
    await supabase
      .from('search_analytics' as any)
      .insert([
        {
          query,
          user_id: 'current-user', // In a real app, this would be auth.uid()
          search_filters: filters,
          result_count: resultCount
        }
      ]);
  } catch (error) {
    console.error("Error tracking search:", error);
  }
};
