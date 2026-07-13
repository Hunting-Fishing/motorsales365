import { supabase } from "@/integrations/supabase/client";
import { ProductRecommendation, RecommendationType } from "@/types/phase3";

export const getPersonalizedRecommendations = async (
  userId: string,
  limit: number = 10
): Promise<ProductRecommendation[]> => {
  try {
    const { data, error } = await supabase
      .from('product_recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ProductRecommendation[];
  } catch (error) {
    console.error('Error fetching personalized recommendations:', error);
    return [];
  }
};

export const getRecommendationsByType = async (
  userId: string,
  type: RecommendationType,
  limit: number = 5
): Promise<ProductRecommendation[]> => {
  try {
    const { data, error } = await supabase
      .from('product_recommendations')
      .select('*')
      .eq('user_id', userId)
      .eq('recommendation_type', type)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ProductRecommendation[];
  } catch (error) {
    console.error('Error fetching recommendations by type:', error);
    return [];
  }
};

export const createRecommendation = async (
  recommendation: Omit<ProductRecommendation, 'id' | 'created_at'>
): Promise<ProductRecommendation | null> => {
  try {
    const { data, error } = await supabase
      .from('product_recommendations')
      .upsert(recommendation, {
        onConflict: 'user_id,product_id,recommendation_type'
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProductRecommendation;
  } catch (error) {
    console.error('Error creating recommendation:', error);
    return null;
  }
};

export const generateViewedTogetherRecommendations = async (
  userId: string,
  currentProductId: string
): Promise<void> => {
  try {
    // Get products the user has viewed
    const { data: userViews, error: viewsError } = await supabase
      .from('product_analytics')
      .select('product_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
      .neq('product_id', currentProductId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (viewsError) throw viewsError;

    // Get what other users who viewed these products also viewed
    const viewedProductIds = userViews?.map(v => v.product_id) || [];
    
    if (viewedProductIds.length === 0) return;

    const { data: coViews, error: coViewsError } = await supabase
      .from('product_analytics')
      .select('product_id, user_id')
      .in('product_id', viewedProductIds)
      .eq('interaction_type', 'view')
      .neq('user_id', userId);

    if (coViewsError) throw coViewsError;

    // Calculate scores based on co-occurrence
    const productScores: { [key: string]: number } = {};
    
    coViews?.forEach(view => {
      if (view.product_id !== currentProductId) {
        productScores[view.product_id] = (productScores[view.product_id] || 0) + 1;
      }
    });

    // Create recommendations for top products
    const recommendations = Object.entries(productScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([productId, score]) => ({
        user_id: userId,
        product_id: productId,
        recommendation_type: 'viewed_together' as const,
        score: Math.min(score / 10, 1) // Normalize score to 0-1
      }));

    if (recommendations.length > 0) {
      await supabase
        .from('product_recommendations')
        .upsert(recommendations, {
          onConflict: 'user_id,product_id,recommendation_type'
        });
    }
  } catch (error) {
    console.error('Error generating viewed together recommendations:', error);
  }
};

export const generateTrendingRecommendations = async (
  userId: string
): Promise<void> => {
  try {
    // Get trending products from the last 7 days
    const { data: trending, error } = await supabase.rpc('get_popular_products', {
      days_back: 7,
      result_limit: 20
    });

    if (error) throw error;

    // Create trending recommendations
    const recommendations = (trending || []).map((product, index) => ({
      user_id: userId,
      product_id: product.id,
      recommendation_type: 'trending' as const,
      score: Math.max(0.1, 1 - (index * 0.05)) // Decreasing score based on ranking
    }));

    if (recommendations.length > 0) {
      await supabase
        .from('product_recommendations')
        .upsert(recommendations, {
          onConflict: 'user_id,product_id,recommendation_type'
        });
    }
  } catch (error) {
    console.error('Error generating trending recommendations:', error);
  }
};

export const refreshUserRecommendations = async (userId: string): Promise<void> => {
  try {
    // Generate all types of recommendations
    await Promise.all([
      generateTrendingRecommendations(userId),
      // Add more recommendation types as needed
    ]);
  } catch (error) {
    console.error('Error refreshing user recommendations:', error);
  }
};