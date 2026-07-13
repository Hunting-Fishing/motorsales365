import { supabase } from '@/integrations/supabase/client';

export interface RecentlyViewedProduct {
  id?: string;
  user_id?: string;
  product_id: string;
  product_name: string;
  product_image_url?: string;
  category?: string;
  viewed_at?: string;
}

export const addRecentlyViewedProduct = async (product: Omit<RecentlyViewedProduct, 'id' | 'user_id' | 'viewed_at'>) => {
  try {
    const { error } = await supabase.rpc('add_recently_viewed_product', {
      p_product_id: product.product_id,
      p_product_name: product.product_name,
      p_product_image_url: product.product_image_url,
      p_category: product.category
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error adding recently viewed product:', error);
    throw error;
  }
};

export const getRecentlyViewedProducts = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('recently_viewed_products')
      .select('*')
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recently viewed products:', error);
    return [];
  }
};

export const clearRecentlyViewedProducts = async () => {
  try {
    const { error } = await supabase
      .from('recently_viewed_products')
      .delete()
      .not('id', 'is', null);

    if (error) throw error;
  } catch (error) {
    console.error('Error clearing recently viewed products:', error);
    throw error;
  }
};