import { supabase } from '@/integrations/supabase/client';

export interface ProductComparison {
  id?: string;
  user_id?: string;
  name: string;
  product_ids: string[];
  created_at?: string;
  updated_at?: string;
}

export const createProductComparison = async (comparison: Omit<ProductComparison, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  try {
    const { data, error } = await supabase
      .from('product_comparisons')
      .insert([comparison])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating product comparison:', error);
    throw error;
  }
};

export const getUserComparisons = async () => {
  try {
    const { data, error } = await supabase
      .from('product_comparisons')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user comparisons:', error);
    return [];
  }
};

export const updateProductComparison = async (comparisonId: string, updates: Partial<ProductComparison>) => {
  try {
    const { data, error } = await supabase
      .from('product_comparisons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', comparisonId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product comparison:', error);
    throw error;
  }
};

export const deleteProductComparison = async (comparisonId: string) => {
  try {
    const { error } = await supabase
      .from('product_comparisons')
      .delete()
      .eq('id', comparisonId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product comparison:', error);
    throw error;
  }
};