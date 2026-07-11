import { supabase } from '@/integrations/supabase/client';

export interface Tool {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  price?: number;
  affiliate_link?: string;
  category_id: string;
  product_type: string;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_approved?: boolean;
  stock_quantity?: number;
  sku?: string;
  average_rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ToolCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Fetch all tools
export const getTools = async (): Promise<Tool[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_approved', true)
      .eq('product_type', 'affiliate')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tools:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
};

// Fetch tool by ID
export const getToolById = async (id: string): Promise<Tool | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_approved', true)
      .single();

    if (error) {
      console.error('Error fetching tool:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching tool:', error);
    return null;
  }
};

// Fetch tools by category
export const getToolsByCategory = async (categoryId: string): Promise<Tool[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_approved', true)
      .eq('product_type', 'affiliate')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tools by category:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tools by category:', error);
    return [];
  }
};

// Fetch tool categories
export const getToolCategories = async (): Promise<ToolCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching tool categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching tool categories:', error);
    return [];
  }
};