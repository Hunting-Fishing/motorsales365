import { FormCategory, FormCategoryResponse } from '@/types/formBuilder';
import { supabase } from '@/lib/supabase';

export async function getFormCategories(): Promise<FormCategory[]> {
  try {
    console.log("Fetching form categories...");
    const { data, error } = await supabase
      .from('form_categories' as any)
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching form categories:', error);
      throw error;
    }
    
    console.log("Form categories fetched:", data);
    
    // Fix the type assertion by first converting to unknown
    return (data as unknown as FormCategory[]) || [];
  } catch (error) {
    console.error('Error in getFormCategories:', error);
    return [];
  }
}

export async function createFormCategory(category: Partial<FormCategory>): Promise<FormCategory | null> {
  try {
    const { data, error } = await supabase
      .from('form_categories' as any)
      .insert({
        name: category.name,
        description: category.description
      })
      .select();
    
    if (error) {
      console.error('Error creating form category:', error);
      throw error;
    }
    
    // Fix the type assertion by first converting to unknown
    return data && data[0] ? (data[0] as unknown as FormCategory) : null;
  } catch (error) {
    console.error('Error in createFormCategory:', error);
    return null;
  }
}

export async function updateFormCategory(id: string, updates: Partial<FormCategory>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('form_categories' as any)
      .update({
        name: updates.name,
        description: updates.description
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating form category:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateFormCategory:', error);
    return false;
  }
}

export async function deleteFormCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('form_categories' as any)
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting form category:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteFormCategory:', error);
    return false;
  }
}
