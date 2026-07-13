import { supabase } from '@/integrations/supabase/client';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  title: string;
  name?: string;
  description?: string;
  image_url?: string;
  price?: number;
  affiliate_link?: string;
  tracking_params?: string;
  category_id: string;
  product_type: string;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_approved?: boolean;
  suggested_by?: string;
  suggestion_reason?: string;
  stock_quantity?: number;
  sku?: string;
  weight?: number;
  dimensions?: any;
  is_available?: boolean;
  average_rating?: number;
  review_count?: number;
  sale_price?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
}

export interface ProductFormData {
  title: string;
  description?: string;
  price?: number;
  image_url?: string;
  affiliate_link?: string;
  category_id: string;
  is_featured?: boolean;
  is_bestseller?: boolean;
  is_approved?: boolean;
  stock_quantity?: number;
  sku?: string;
  product_type: 'affiliate' | 'suggested';
}

// Admin-specific product operations
export const fetchAllProducts = async (includeUnapproved: boolean = true): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `);

    if (!includeUnapproved) {
      query = query.eq('is_approved', true);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const createProductAdmin = async (productData: ProductFormData): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...productData,
        name: productData.title,
        is_approved: productData.is_approved ?? true,
        product_type: productData.product_type || 'affiliate'
      }])
      .select(`
        *,
        category:product_categories(*)
      `)
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
};

export const updateProductAdmin = async (id: string, updates: Partial<ProductFormData>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        category:product_categories(*)
      `)
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    return null;
  }
};

export const deleteProductAdmin = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

export const toggleProductFeature = async (id: string, featured: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_featured: featured })
      .eq('id', id);

    if (error) {
      console.error('Error updating product feature status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating product feature status:', error);
    return false;
  }
};

export const toggleProductBestseller = async (id: string, bestseller: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_bestseller: bestseller })
      .eq('id', id);

    if (error) {
      console.error('Error updating product bestseller status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating product bestseller status:', error);
    return false;
  }
};

export const bulkUpdateProducts = async (productIds: string[], updates: Partial<ProductFormData>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', productIds);

    if (error) {
      console.error('Error bulk updating products:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error bulk updating products:', error);
    return false;
  }
};

export const getProductAnalytics = async () => {
  try {
    // Get total products
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true);

    // Get featured products count
    const { count: featuredCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true)
      .eq('is_approved', true);

    // Get bestseller products count
    const { count: bestsellerCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_bestseller', true)
      .eq('is_approved', true);

    // Get products by category
    const { data: categoryData } = await supabase
      .from('products')
      .select('category_id, product_categories(name)')
      .eq('is_approved', true);

    const categoryStats = categoryData?.reduce((acc: any, item) => {
      const categoryName = (item as any).product_categories?.name || 'Unknown';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      totalProducts: totalProducts || 0,
      featuredCount: featuredCount || 0,
      bestsellerCount: bestsellerCount || 0,
      categoryStats
    };
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    return {
      totalProducts: 0,
      featuredCount: 0,
      bestsellerCount: 0,
      categoryStats: {}
    };
  }
};