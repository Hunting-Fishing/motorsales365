// Product Bundle Service
import { supabase } from '@/integrations/supabase/client';
import { ProductBundle, BundleItem, BundleFormData, BundleCalculation } from '@/types/advanced-product';

export class BundleService {
  // Get all active bundles
  async getBundles(filters?: {
    category_id?: string;
    featured?: boolean;
    limit?: number;
  }): Promise<ProductBundle[]> {
    let query = supabase
      .from('product_bundles')
      .select(`
        *,
        bundle_items (
          *,
          products (id, name, title, price, image_url, description)
        )
      `)
      .eq('is_active', true);

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters?.featured !== undefined) {
      query = query.eq('is_featured', filters.featured);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.transformBundle);
  }

  // Get single bundle with items
  async getBundle(id: string): Promise<ProductBundle | null> {
    const { data, error } = await supabase
      .from('product_bundles')
      .select(`
        *,
        bundle_items (
          *,
          products (id, name, title, price, image_url, description)
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.transformBundle(data);
  }

  // Get featured bundles
  async getFeaturedBundles(limit = 6): Promise<ProductBundle[]> {
    return this.getBundles({ featured: true, limit });
  }

  // Create new bundle
  async createBundle(bundleData: BundleFormData): Promise<ProductBundle> {
    const { items, ...bundleInfo } = bundleData;

    // Create bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('product_bundles')
      .insert({
        ...bundleInfo,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Add bundle items
    if (items.length > 0) {
      const bundleItems = items.map(item => ({
        bundle_id: bundle.id,
        ...item
      }));

      const { error: itemsError } = await supabase
        .from('bundle_items')
        .insert(bundleItems);

      if (itemsError) throw itemsError;
    }

    return this.getBundle(bundle.id) as Promise<ProductBundle>;
  }

  // Update bundle
  async updateBundle(id: string, bundleData: Partial<BundleFormData>): Promise<ProductBundle> {
    const { items, ...bundleInfo } = bundleData;

    // Update bundle
    const { error: bundleError } = await supabase
      .from('product_bundles')
      .update(bundleInfo)
      .eq('id', id);

    if (bundleError) throw bundleError;

    // Update items if provided
    if (items) {
      // Delete existing items
      await supabase
        .from('bundle_items')
        .delete()
        .eq('bundle_id', id);

      // Add new items
      if (items.length > 0) {
        const bundleItems = items.map(item => ({
          bundle_id: id,
          ...item
        }));

        const { error: itemsError } = await supabase
          .from('bundle_items')
          .insert(bundleItems);

        if (itemsError) throw itemsError;
      }
    }

    return this.getBundle(id) as Promise<ProductBundle>;
  }

  // Delete bundle
  async deleteBundle(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_bundles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Calculate bundle pricing
  async calculateBundlePrice(bundleId: string, quantity = 1): Promise<BundleCalculation> {
    const bundle = await this.getBundle(bundleId);
    if (!bundle || !bundle.items) {
      throw new Error('Bundle not found');
    }

    let individual_total = 0;
    const items = bundle.items.map(item => {
      const itemPrice = item.custom_price || item.product?.price || 0;
      const itemTotal = itemPrice * item.quantity;
      individual_total += itemTotal;

      return {
        product_id: item.product_id,
        name: item.product?.name || item.product?.title || 'Unknown Product',
        individual_price: itemPrice,
        bundle_price: itemPrice, // Will be adjusted based on bundle discount
        quantity: item.quantity
      };
    });

    // Apply bundle discount
    let bundle_price = bundle.base_price;
    if (bundle.discount_percentage && bundle.discount_percentage > 0) {
      bundle_price = individual_total * (1 - bundle.discount_percentage / 100);
    } else if (bundle.discount_amount && bundle.discount_amount > 0) {
      bundle_price = individual_total - bundle.discount_amount;
    }

    // Adjust individual item prices proportionally
    const discount_ratio = bundle_price / individual_total;
    items.forEach(item => {
      item.bundle_price = item.individual_price * discount_ratio;
    });

    const total_savings = (individual_total - bundle_price) * quantity;
    const savings_percentage = individual_total > 0 ? (total_savings / (individual_total * quantity)) * 100 : 0;

    return {
      individual_total: individual_total * quantity,
      bundle_price: bundle_price * quantity,
      total_savings,
      savings_percentage,
      items
    };
  }

  // Get bundles containing a specific product
  async getBundlesWithProduct(productId: string): Promise<ProductBundle[]> {
    const { data, error } = await supabase
      .from('product_bundles')
      .select(`
        *,
        bundle_items!inner (
          *,
          products (id, name, title, price, image_url, description)
        )
      `)
      .eq('is_active', true)
      .eq('bundle_items.product_id', productId);

    if (error) throw error;

    return (data || []).map(this.transformBundle);
  }

  // Private helper to transform database result
  private transformBundle(data: any): ProductBundle {
    const bundle: ProductBundle = {
      id: data.id,
      name: data.name,
      description: data.description,
      bundle_type: data.bundle_type,
      base_price: Number(data.base_price),
      discount_percentage: data.discount_percentage ? Number(data.discount_percentage) : undefined,
      discount_amount: data.discount_amount ? Number(data.discount_amount) : undefined,
      is_active: data.is_active,
      start_date: data.start_date,
      end_date: data.end_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      minimum_quantity: data.minimum_quantity,
      maximum_quantity: data.maximum_quantity,
      category_id: data.category_id,
      tags: data.tags || [],
      image_url: data.image_url,
      is_featured: data.is_featured,
      items: data.bundle_items || []
    };

    // Calculate derived values
    if (bundle.items && bundle.items.length > 0) {
      const individual_total = bundle.items.reduce((sum, item) => {
        const price = item.custom_price || item.product?.price || 0;
        return sum + (price * item.quantity);
      }, 0);

      bundle.calculated_price = bundle.base_price;
      if (bundle.discount_percentage) {
        bundle.calculated_price = individual_total * (1 - bundle.discount_percentage / 100);
      } else if (bundle.discount_amount) {
        bundle.calculated_price = individual_total - bundle.discount_amount;
      }

      bundle.savings = individual_total - bundle.calculated_price;
    }

    return bundle;
  }
}

export const bundleService = new BundleService();