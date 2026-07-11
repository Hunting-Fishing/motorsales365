// Standardized Product Types - Single Source of Truth
// This replaces the inconsistent product interfaces across the app

export type ProductTier = 'premium' | 'midgrade' | 'economy';

// Database product schema (matches Supabase schema exactly)
export interface DatabaseProduct {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  affiliate_link: string;
  tracking_params?: string;
  average_rating: number;
  review_count: number;
  category_id: string;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  is_available: boolean;
  stock_quantity: number;
  sku: string;
  product_type: string;
  weight?: number;
  dimensions?: any;
  sale_price?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  inventory_item_id?: string;
  low_stock_threshold: number;
  track_inventory: boolean;
  suggested_by?: string;
  suggestion_reason?: string;
}

// Unified product interface for the frontend
export interface Product {
  id: string;
  name: string;
  title: string; // Keep both for compatibility
  description: string;
  price: number;
  retailPrice: number; // Alias for price
  imageUrl: string;
  image_url: string; // Keep both for compatibility
  affiliateUrl: string;
  affiliate_link: string; // Keep both for compatibility
  category: string;
  categoryId: string;
  manufacturer: string;
  rating: number;
  reviewCount: number;
  tier: ProductTier;
  isFeatured: boolean;
  bestSeller: boolean;
  stockQuantity: number;
  sku: string;
  productType: string;
  createdAt: string;
  updatedAt: string;
  // Optional fields for enhanced functionality
  discount?: number;
  freeShipping?: boolean;
  source?: 'amazon' | 'other';
  model?: string;
  tags?: string[];
  subcategory?: string;
  seller?: string;
}

// Cart item interface
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  manufacturer: string;
  quantity?: number;
}

// Wishlist item interface
export interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  manufacturer: string;
}

// Product analytics data
export interface ProductAnalytics {
  productId: string;
  productName: string;
  category: string;
  interactionType: 'view' | 'click' | 'add_to_cart' | 'save' | 'purchase';
  metadata?: {
    price?: number;
    manufacturer?: string;
    quantity?: number;
    viewType?: string;
    action?: string;
    [key: string]: any;
  };
}

// Product search filters
export interface ProductFilters {
  category?: string;
  manufacturer?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  featured?: boolean;
  bestseller?: boolean;
  available?: boolean;
  search?: string;
  tags?: string[];
  tier?: ProductTier;
}

// Product form data for admin/management
export interface ProductFormData {
  title: string;
  description: string;
  price: number;
  image_url: string;
  affiliate_link: string;
  category_id: string;
  manufacturer?: string;
  sku?: string;
  stock_quantity?: number;
  is_featured?: boolean;
  is_bestseller?: boolean;
  tags?: string[];
}

// Popular products response from RPC
export interface PopularProduct {
  product_id: string;
  product_name: string;
  interaction_count: number;
  view_count: number;
  cart_add_count: number;
  save_count: number;
  click_count: number;
  average_rating: number;
  review_count: number;
  image_url: string;
  price: number;
  category: string;
}

// Transform database product to unified Product interface
export const transformDatabaseProduct = (dbProduct: DatabaseProduct, categoryName?: string): Product => ({
  id: dbProduct.id,
  name: dbProduct.name || dbProduct.title,
  title: dbProduct.title,
  description: dbProduct.description || '',
  price: dbProduct.price || 0,
  retailPrice: dbProduct.sale_price || dbProduct.price || 0,
  imageUrl: dbProduct.image_url || '',
  image_url: dbProduct.image_url || '',
  affiliateUrl: dbProduct.affiliate_link || '',
  affiliate_link: dbProduct.affiliate_link || '',
  category: categoryName || 'Uncategorized',
  categoryId: dbProduct.category_id,
  manufacturer: 'Professional Tools', // Extract from product data later
  rating: dbProduct.average_rating || 0,
  reviewCount: dbProduct.review_count || 0,
  tier: dbProduct.price > 500 ? 'premium' : dbProduct.price > 100 ? 'midgrade' : 'economy',
  isFeatured: dbProduct.is_featured || false,
  bestSeller: dbProduct.is_bestseller || false,
  stockQuantity: dbProduct.stock_quantity || 0,
  sku: dbProduct.sku || '',
  productType: dbProduct.product_type,
  createdAt: dbProduct.created_at,
  updatedAt: dbProduct.updated_at,
  discount: dbProduct.sale_price ? Math.round(((dbProduct.price - dbProduct.sale_price) / dbProduct.price) * 100) : 0,
  freeShipping: dbProduct.price > 100,
  source: 'other',
  tags: [],
  subcategory: undefined,
  seller: 'Tool Supply Co'
});

// Transform popular product to unified Product interface
export const transformPopularProduct = (popularProduct: any): Product => ({
  id: popularProduct.id || popularProduct.product_id,
  name: popularProduct.name || popularProduct.product_name,
  title: popularProduct.title || popularProduct.name || popularProduct.product_name,
  description: '',
  price: popularProduct.price,
  retailPrice: popularProduct.price,
  imageUrl: popularProduct.image_url || '',
  image_url: popularProduct.image_url || '',
  affiliateUrl: '',
  affiliate_link: '',
  category: popularProduct.category,
  categoryId: '',
  manufacturer: 'Professional Tools',
  rating: popularProduct.average_rating || 0,
  reviewCount: popularProduct.review_count || 0,
  tier: popularProduct.price > 500 ? 'premium' : popularProduct.price > 100 ? 'midgrade' : 'economy',
  isFeatured: false,
  bestSeller: popularProduct.interaction_count > 10,
  stockQuantity: 100,
  sku: '',
  productType: 'affiliate',
  createdAt: '',
  updatedAt: '',
  discount: 0,
  freeShipping: false,
  source: 'other',
  tags: [],
  subcategory: undefined,
  seller: 'Tool Supply Co'
});