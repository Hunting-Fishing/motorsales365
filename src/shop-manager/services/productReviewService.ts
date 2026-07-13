import { supabase } from '@/integrations/supabase/client';

export interface ProductReview {
  id?: string;
  product_id: string;
  user_id?: string;
  reviewer_name: string;
  rating: number;
  title?: string;
  content?: string;
  is_verified_purchase?: boolean;
  is_approved?: boolean;
  helpful_count?: number;
  review_images?: string[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ReviewHelpfulness {
  id?: string;
  review_id: string;
  user_id?: string;
  is_helpful: boolean;
  created_at?: string;
}

export const getProductReviews = async (productId: string) => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return [];
  }
};

export const createProductReview = async (review: Omit<ProductReview, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .insert([{
        product_id: review.product_id,
        user_id: review.user_id || '',
        reviewer_name: review.reviewer_name,
        rating: review.rating,
        review_title: review.title,
        review_text: review.content,
        is_verified_purchase: review.is_verified_purchase || false,
        is_approved: review.is_approved || false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating product review:', error);
    throw error;
  }
};

export const updateProductReview = async (reviewId: string, updates: Partial<ProductReview>) => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product review:', error);
    throw error;
  }
};

export const markReviewHelpful = async (reviewId: string, isHelpful: boolean) => {
  try {
    const { data, error } = await supabase
      .from('review_helpfulness')
      .upsert([{
        review_id: reviewId,
        is_helpful: isHelpful
      }], {
        onConflict: 'review_id,user_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking review helpful:', error);
    throw error;
  }
};

export const getUserReviewHelpfulness = async (reviewId: string) => {
  try {
    const { data, error } = await supabase
      .from('review_helpfulness')
      .select('is_helpful')
      .eq('review_id', reviewId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
    return data?.is_helpful || null;
  } catch (error) {
    console.error('Error getting user review helpfulness:', error);
    return null;
  }
};

export const getReviewSummary = async (productId: string) => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_approved', true);

    if (error) throw error;

    const reviews = data || [];
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: [0, 0, 0, 0, 0]
      };
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    const ratingBreakdown = [0, 0, 0, 0, 0];
    
    reviews.forEach(review => {
      ratingBreakdown[review.rating - 1]++;
    });

    return {
      averageRating: Number(averageRating.toFixed(1)),
      totalReviews,
      ratingBreakdown
    };
  } catch (error) {
    console.error('Error getting review summary:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: [0, 0, 0, 0, 0]
    };
  }
};