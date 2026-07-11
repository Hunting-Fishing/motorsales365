// Unified Product Service - Single Source of Truth for Product Operations
import { supabase } from '@/integrations/supabase/client';
import { 
  Product, 
  DatabaseProduct, 
  ProductFilters, 
  ProductFormData, 
  PopularProduct,
  transformDatabaseProduct,
  transformPopularProduct
} from '@/types/product';

export class ProductService {
  // Get all products with optional filters
  async getProducts(filters: ProductFilters = {}): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select(`
        *,
        product_categories(name)
      `)
      .eq('is_approved', true);

    // Apply filters
    if (filters.category) {
      query = query.eq('category_id', filters.category);
    }
    
    if (filters.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }
    
    if (filters.bestseller !== undefined) {
      query = query.eq('is_bestseller', filters.bestseller);
    }
    
    if (filters.available !== undefined) {
      query = query.gt('stock_quantity', 0);
    }
    
    if (filters.minPrice !== undefined) {
      query = query.gte('price', filters.minPrice);
    }
    
    if (filters.maxPrice !== undefined) {
      query = query.lte('price', filters.maxPrice);
    }
    
    if (filters.rating !== undefined) {
      query = query.gte('average_rating', filters.rating);
    }
    
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map((item: any) => 
      transformDatabaseProduct(item, item.product_categories?.name)
    );
  }

  // Get single product by ID
  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories(name)
      `)
      .eq('id', id)
      .eq('is_approved', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return transformDatabaseProduct(data, data.product_categories?.name);
  }

  // Get featured products
  async getFeaturedProducts(limit = 8): Promise<Product[]> {
    return this.getProducts({ featured: true, available: true });
  }

  // Get bestseller products
  async getBestsellerProducts(limit = 8): Promise<Product[]> {
    return this.getProducts({ bestseller: true, available: true });
  }

  // Get popular products using RPC
  async getPopularProducts(daysBack = 7, limit = 10): Promise<Product[]> {
    const { data, error } = await supabase.rpc('get_popular_products', { 
      days_back: daysBack,
      result_limit: limit 
    });
    
    if (error) throw error;
    
    return (data || []).map(transformPopularProduct);
  }

  // Get products by category
  async getProductsByCategory(categoryId: string, limit?: number): Promise<Product[]> {
    return this.getProducts({ category: categoryId });
  }

  // Get products by manufacturer (search in title/description)
  async getProductsByManufacturer(manufacturer: string): Promise<Product[]> {
    return this.getProducts({ search: manufacturer });
  }

  // Search products
  async searchProducts(query: string, filters: ProductFilters = {}): Promise<Product[]> {
    return this.getProducts({ ...filters, search: query });
  }

  // Create new product (admin)
  async createProduct(productData: ProductFormData): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: productData.title,
        title: productData.title,
        description: productData.description,
        price: productData.price,
        image_url: productData.image_url,
        affiliate_link: productData.affiliate_link,
        category_id: productData.category_id,
        sku: productData.sku || '',
        stock_quantity: productData.stock_quantity || 0,
        is_featured: productData.is_featured || false,
        is_bestseller: productData.is_bestseller || false,
        is_approved: true,
        product_type: 'affiliate',
        average_rating: 0,
        review_count: 0
      })
      .select(`
        *,
        product_categories(name)
      `)
      .single();

    if (error) throw error;
    
    return transformDatabaseProduct(data, data.product_categories?.name);
  }

  // Update product (admin)
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...productData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        product_categories(name)
      `)
      .single();

    if (error) throw error;
    
    return transformDatabaseProduct(data, data.product_categories?.name);
  }

  // Delete product (admin)
  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Track product analytics
  async trackProductAnalytics(data: {
    productId: string;
    productName: string;
    category: string;
    interactionType: string;
    metadata?: any;
  }): Promise<void> {
    const { error } = await supabase
      .from('product_analytics')
      .insert({
        product_id: data.productId,
        product_name: data.productName,
        category: data.category,
        interaction_type: data.interactionType,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        metadata: data.metadata || {}
      });

    if (error) {
      console.error('Error tracking product analytics:', error);
      // Don't throw - analytics should not break the main flow
    }
  }

  // Get product categories
  async getCategories(): Promise<Array<{id: string; name: string; description?: string}>> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    
    return data || [];
  }

  // Get recently viewed products for a user
  async getRecentlyViewedProducts(userId: string, limit = 10): Promise<Product[]> {
    const { data, error } = await supabase.rpc('get_recently_viewed_products', {
      user_id_param: userId,
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching recently viewed products:', error);
      return [];
    }

    // Transform the RPC result to Product interface
    return (data || []).map((item: any) => {
      const computedTier = item.price > 500 ? 'premium' : item.price > 100 ? 'midgrade' : 'economy';
      return {
        id: item.product_id,
        name: item.product_name,
        title: item.product_name,
        description: '',
        price: item.price || 0,
        retailPrice: item.price || 0,
        imageUrl: item.image_url || '',
        image_url: item.image_url || '',
        affiliateUrl: item.affiliate_link || '',
        affiliate_link: item.affiliate_link || '',
        category: item.category || 'Uncategorized',
        categoryId: '',
        manufacturer: 'Professional Tools',
        rating: item.average_rating || 0,
        reviewCount: item.review_count || 0,
        tier: computedTier as 'premium' | 'midgrade' | 'economy',
        isFeatured: false,
        bestSeller: false,
        stockQuantity: 100,
        sku: '',
        productType: 'affiliate',
        createdAt: '',
        updatedAt: '',
        discount: 0,
        freeShipping: false,
        source: 'other' as 'amazon' | 'other',
        tags: [],
        subcategory: undefined,
        seller: 'Tool Supply Co'
      };
    });
  }
}

// Export singleton instance
export const productService = new ProductService();