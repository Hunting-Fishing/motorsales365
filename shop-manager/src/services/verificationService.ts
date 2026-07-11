import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a user has purchased a specific product (for verified reviews)
 */
export const checkVerifiedPurchase = async (userId: string, productId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_verified_purchase', {
      p_user_id: userId,
      p_product_id: productId
    });

    if (error) {
      console.error('Error checking verified purchase:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error checking verified purchase:', error);
    return false;
  }
};