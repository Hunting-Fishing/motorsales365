
import { supabase } from '@/lib/supabase';

// Define interfaces that match the actual database schema
interface DatabaseProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  affiliate_link: string;
  average_rating: number;
  review_count: number;
  category_id: string;
  created_at: string;
  updated_at: string;
  is_approved: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  stock_quantity: number;
  sku: string;
  product_type: string;
}

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image_url: string;
  affiliate_link: string;
  average_rating: number;
  review_count: number;
  category: string;
  manufacturer: string;
  featured: boolean;
  subcategory?: string;
  seller?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// Transform database product to our ProductData interface
const transformDatabaseProduct = (dbProduct: DatabaseProduct): ProductData => ({
  id: dbProduct.id,
  name: dbProduct.title || 'Product',
  slug: dbProduct.title?.toLowerCase().replace(/\s+/g, '-') || dbProduct.id,
  description: dbProduct.description || '',
  price: dbProduct.price || 0,
  image_url: dbProduct.image_url || '',
  affiliate_link: dbProduct.affiliate_link || '',
  average_rating: dbProduct.average_rating || 0,
  review_count: dbProduct.review_count || 0,
  category: 'Tools', // Will resolve category name separately
  manufacturer: 'Professional Tools', // Extract from product data later
  featured: dbProduct.is_featured || false,
  subcategory: undefined,
  seller: 'Tool Supply Co',
  tags: [],
  created_at: dbProduct.created_at || '',
  updated_at: dbProduct.updated_at || dbProduct.created_at || ''
});

export async function getProducts(): Promise<ProductData[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_approved', true)
    .eq('product_type', 'affiliate')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(transformDatabaseProduct);
}

export async function getProductsByCategory(category: string): Promise<ProductData[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_approved', true)
    .eq('product_type', 'affiliate')
    .eq('category_id', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(transformDatabaseProduct);
}

export async function getProductsByManufacturer(manufacturer: string): Promise<ProductData[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_approved', true)
    .eq('product_type', 'affiliate')
    .or(`title.ilike.%${manufacturer}%,description.ilike.%${manufacturer}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(transformDatabaseProduct);
}

export async function getProductsByFeaturedGroup(groupId: string): Promise<ProductData[]> {
  // Since we don't have featured groups, return empty array
  return [];
}

export async function createProduct(productData: Partial<ProductData>): Promise<ProductData> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: productData.name || productData.description || 'Untitled Product',
      description: productData.description || '',
      price: productData.price || 0,
      image_url: productData.image_url || '',
      affiliate_link: productData.affiliate_link || '',
      category_id: 'default',
      is_approved: true,
      product_type: 'affiliate'
    } as any)
    .select()
    .single();

  if (error) throw error;
  
  return transformDatabaseProduct(data);
}

export async function updateProduct(id: string, productData: Partial<ProductData>): Promise<ProductData> {
  const { data, error } = await supabase
    .from('products')
    .update({
      title: productData.name,
      description: productData.description,
      price: productData.price,
      image_url: productData.image_url,
      affiliate_link: productData.affiliate_link,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  
  return transformDatabaseProduct(data);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function trackProductAnalytics(data: {
  productId: string;
  productName: string;
  category: string;
  interactionType: string;
  additionalData?: any;
}): Promise<void> {
  // Simple implementation - could be expanded to track to an analytics table
  console.log('Product analytics tracked:', data);
}
