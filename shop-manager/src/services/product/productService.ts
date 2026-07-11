import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export const productService = {
  // Get all products with optional filters
  async getProducts(filters?: {
    category?: string;
    featured?: boolean;
    bestseller?: boolean;
    available?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('products')
      .select(`
        *,
        product_categories(name, description)
      `);

    if (filters?.category) {
      query = query.eq('category_id', filters.category);
    }
    if (filters?.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }
    if (filters?.bestseller !== undefined) {
      query = query.eq('is_bestseller', filters.bestseller);
    }
    if (filters?.available !== undefined) {
      query = query.eq('is_available', filters.available);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get single product by ID
  async getProduct(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name, description),
        product_reviews(
          id,
          rating,
          comment,
          reviewer_name,
          is_approved,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new product
  async createProduct(product: ProductInsert) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update product
  async updateProduct(id: string, updates: ProductUpdate) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete product
  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Get featured products
  async getFeaturedProducts(limit = 8) {
    return this.getProducts({ featured: true, available: true, limit });
  },

  // Get bestseller products
  async getBestsellerProducts(limit = 8) {
    return this.getProducts({ bestseller: true, available: true, limit });
  },

  // Get popular products using RPC
  async getPopularProducts(limit = 10) {
    const { data, error } = await supabase.rpc('get_popular_products', { 
      limit_count: limit 
    });
    if (error) throw error;
    return data;
  },

  // Get recently viewed products using RPC
  async getRecentlyViewedProducts(userId: string, limit = 10) {
    const { data, error } = await supabase.rpc('get_recently_viewed_products', {
      user_id_param: userId,
      limit_count: limit
    });
    if (error) throw error;
    return data;
  },

  // Record product view
  async recordProductView(productId: string, userId: string) {
    const { error } = await supabase.rpc('record_product_view', {
      product_id_param: productId,
      user_id_param: userId
    });
    if (error) throw error;
  },

  // Search products
  async searchProducts(query: string, limit = 20, offset = 0) {
    return this.getProducts({ search: query, limit, offset, available: true });
  },

  // Get products by category
  async getProductsByCategory(categoryId: string, limit = 20, offset = 0) {
    return this.getProducts({ category: categoryId, available: true, limit, offset });
  },

  // Check product availability and stock
  async checkProductAvailability(productId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('is_available, stock_quantity, track_inventory')
      .eq('id', productId)
      .single();

    if (error) throw error;
    
    const isAvailable = data.is_available && 
      (!data.track_inventory || (data.stock_quantity && data.stock_quantity > 0));
    
    return {
      available: isAvailable,
      stockQuantity: data.stock_quantity,
      trackInventory: data.track_inventory
    };
  },

  // Update product inventory
  async updateProductInventory(productId: string, quantityChange: number) {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity, track_inventory')
      .eq('id', productId)
      .single();

    if (!product || !product.track_inventory) return;

    const newQuantity = (product.stock_quantity || 0) + quantityChange;
    
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: Math.max(0, newQuantity) })
      .eq('id', productId);

    if (error) throw error;
  }
};