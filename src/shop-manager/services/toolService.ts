import { supabase } from '@/integrations/supabase/client';

export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url?: string;
  price: number;
  rating?: number;
  review_count?: number;
  is_featured?: boolean;
  discount?: number;
  specifications?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ToolReview {
  id: string;
  tool_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export const toolService = {
  async getToolById(toolId: string): Promise<Tool | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', toolId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tool:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.title || 'Unknown Tool',
      category: 'Tools',
      description: data.description || '',
      image_url: data.image_url,
      price: data.price || 0,
      rating: data.average_rating || 0,
      review_count: data.review_count || 0,
      is_featured: data.is_featured || false,
      discount: 0,
      specifications: data.dimensions ? { dimensions: data.dimensions } : {},
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  },

  async getToolsByCategory(category: string): Promise<Tool[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('title');

    if (error) {
      console.error('Error fetching tools by category:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.title || 'Unknown Tool',
      category: 'Tools',
      description: item.description || '',
      image_url: item.image_url,
      price: item.price || 0,
      rating: item.average_rating || 0,
      review_count: item.review_count || 0,
      is_featured: item.is_featured || false,
      discount: 0,
      specifications: item.dimensions ? { dimensions: item.dimensions } : {},
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  },

  async getToolReviews(toolId: string): Promise<ToolReview[]> {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', toolId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tool reviews:', error);
      return [];
    }

    return data.map(review => ({
      id: review.id,
      tool_id: review.product_id,
      user_name: `User ${review.user_id.slice(0, 8)}`,
      rating: review.rating,
      comment: review.review_text,
      created_at: review.created_at
    }));
  }
};