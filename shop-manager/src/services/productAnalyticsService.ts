import { supabase } from '@/integrations/supabase/client';

export type InteractionType = 'view' | 'click' | 'add_to_cart' | 'save' | 'share' | 'purchase' | 'compare';

export interface ProductAnalytics {
  id?: string;
  product_id: string;
  product_name: string;
  category?: string;
  interaction_type: InteractionType;
  user_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface ProductStats {
  total_views: number;
  total_clicks: number;
  total_cart_adds: number;
  total_saves: number;
  avg_rating: number;
  review_count: number;
}

export const trackProductInteraction = async (data: Omit<ProductAnalytics, 'id' | 'created_at'>) => {
  try {
    const { data: result, error } = await supabase.rpc('track_product_interaction', {
      p_product_id: data.product_id,
      p_product_name: data.product_name,
      p_category: data.category,
      p_interaction_type: data.interaction_type,
      p_user_id: data.user_id,
      p_session_id: data.session_id,
      p_metadata: data.metadata || {}
    });

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error tracking product interaction:', error);
    throw error;
  }
};

export const getProductStats = async (productId: string): Promise<ProductStats> => {
  try {
    const { data, error } = await supabase.rpc('get_product_stats', {
      p_product_id: productId
    });

    if (error) throw error;
    
    const defaultStats: ProductStats = {
      total_views: 0,
      total_clicks: 0,
      total_cart_adds: 0,
      total_saves: 0,
      avg_rating: 0,
      review_count: 0
    };
    
    if (!data) return defaultStats;
    
    const result = Array.isArray(data) ? data[0] : data;
    return (result as unknown as ProductStats) || defaultStats;
  } catch (error) {
    console.error('Error getting product stats:', error);
    return {
      total_views: 0,
      total_clicks: 0,
      total_cart_adds: 0,
      total_saves: 0,
      avg_rating: 0,
      review_count: 0
    };
  }
};

export const getPopularProducts = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_popular_products', {
      days_back: 7,
      result_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting popular products:', error);
    return [];
  }
};

export const getAnalyticsByCategory = async () => {
  try {
    const { data, error } = await supabase.rpc('get_product_interactions_by_category');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting analytics by category:', error);
    return [];
  }
};

export const getRecentlyViewedProducts = async (userId?: string, sessionId?: string, limit: number = 10) => {
  try {
    const { data, error } = await supabase.rpc('get_recently_viewed_products', {
      p_user_id: userId,
      p_session_id: sessionId,
      result_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting recently viewed products:', error);
    return [];
  }
};