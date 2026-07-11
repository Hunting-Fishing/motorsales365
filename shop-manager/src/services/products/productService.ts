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

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_title?: string;
  review_text?: string;
  is_approved: boolean;
  is_verified_purchase: boolean;
  helpful_votes: number;
  created_at: string;
  updated_at: string;
}

export interface ProductSubmission {
  id: string;
  product_name: string;
  product_url: string;
  suggested_by?: string;
  suggested_category: string;
  notes?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  submitted_at: string;
}

// Product Categories
export const fetchProductCategories = async (): Promise<ProductCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching product categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }
};

export const createProductCategory = async (category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>): Promise<ProductCategory | null> => {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .insert([category])
      .select()
      .single();

    if (error) {
      console.error('Error creating product category:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating product category:', error);
    return null;
  }
};

// Products
export const fetchProducts = async (params?: {
  category_id?: string;
  is_featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('is_approved', true);

    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
    }

    if (params?.is_featured !== undefined) {
      query = query.eq('is_featured', params.is_featured);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, (params.offset + (params.limit || 10)) - 1);
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

export const fetchProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('id', id)
      .eq('is_approved', true)
      .single();

    if (error) {
      console.error('Error fetching product:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

export const createProduct = async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product | null> => {
  try {
    // Transform the product data to match database schema
    const productData = {
      ...product,
      product_type: product.product_type as 'affiliate' | 'suggested'
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...productData,
        name: productData.title
      }])
      .select()
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

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
  try {
    // Transform updates to match database schema
    const updateData = {
      ...updates,
      ...(updates.product_type && { product_type: updates.product_type as 'affiliate' | 'suggested' })
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
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

// Product Reviews
export const fetchProductReviews = async (productId: string): Promise<ProductReview[]> => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product reviews:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    return [];
  }
};

export const createProductReview = async (review: Omit<ProductReview, 'id' | 'created_at' | 'updated_at'>): Promise<ProductReview | null> => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .insert([review])
      .select()
      .single();

    if (error) {
      console.error('Error creating product review:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating product review:', error);
    return null;
  }
};

// Product Submissions
export const fetchProductSubmissions = async (): Promise<ProductSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('product_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching product submissions:', error);
      return [];
    }

    return (data || []).map(item => ({
      ...item,
      status: item.status as 'pending' | 'reviewing' | 'approved' | 'rejected'
    }));
  } catch (error) {
    console.error('Error fetching product submissions:', error);
    return [];
  }
};

export const updateProductSubmissionStatus = async (
  id: string, 
  status: 'pending' | 'reviewing' | 'approved' | 'rejected',
  adminNotes?: string
): Promise<ProductSubmission | null> => {
  try {
    const updates: any = { 
      status
    };
    
    if (adminNotes) {
      updates.notes = adminNotes;
    }

    const { data, error } = await supabase
      .from('product_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product submission:', error);
      return null;
    }

    return {
      ...data,
      status: data.status as 'pending' | 'reviewing' | 'approved' | 'rejected'
    };
  } catch (error) {
    console.error('Error updating product submission:', error);
    return null;
  }
};

export const createProductSubmission = async (submission: Omit<ProductSubmission, 'id' | 'submitted_at'>): Promise<ProductSubmission | null> => {
  try {
    const { data, error } = await supabase
      .from('product_submissions')
      .insert([submission])
      .select()
      .single();

    if (error) {
      console.error('Error creating product submission:', error);
      return null;
    }

    return {
      ...data,
      status: data.status as 'pending' | 'reviewing' | 'approved' | 'rejected'
    };
  } catch (error) {
    console.error('Error creating product submission:', error);
    return null;
  }
};