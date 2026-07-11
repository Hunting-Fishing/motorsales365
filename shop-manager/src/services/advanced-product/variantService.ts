// Product Variants Service
import { supabase } from '@/integrations/supabase/client';
import { ProductVariant, VariantFormData } from '@/types/advanced-product';

export class VariantService {
  // Get variants for a product
  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('parent_product_id', productId)
      .eq('is_available', true)
      .order('sort_order');

    if (error) throw error;

    return (data || []).map(this.transformVariant);
  }

  // Get single variant
  async getVariant(id: string): Promise<ProductVariant | null> {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('id', id)
      .eq('is_available', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.transformVariant(data);
  }

  // Create variant
  async createVariant(variantData: VariantFormData): Promise<ProductVariant> {
    const { data, error } = await supabase
      .from('product_variants')
      .insert(variantData)
      .select()
      .single();

    if (error) throw error;
    return this.transformVariant(data);
  }

  // Update variant
  async updateVariant(id: string, variantData: Partial<VariantFormData>): Promise<ProductVariant> {
    const { data, error } = await supabase
      .from('product_variants')
      .update(variantData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.transformVariant(data);
  }

  // Delete variant
  async deleteVariant(id: string): Promise<void> {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get variant types for a product
  async getVariantTypes(productId: string): Promise<Array<{
    type: string;
    variants: ProductVariant[];
  }>> {
    const variants = await this.getProductVariants(productId);
    
    const groupedVariants = variants.reduce((groups, variant) => {
      const type = variant.variant_type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(variant);
      return groups;
    }, {} as Record<string, ProductVariant[]>);

    return Object.entries(groupedVariants).map(([type, variants]) => ({
      type,
      variants: variants.sort((a, b) => a.sort_order - b.sort_order)
    }));
  }

  // Calculate variant price
  async calculateVariantPrice(
    variantId: string,
    baseProductPrice: number
  ): Promise<number> {
    const variant = await this.getVariant(variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }

    return baseProductPrice + variant.price_adjustment;
  }

  // Check variant stock
  async checkVariantStock(variantId: string, requestedQuantity: number): Promise<{
    available: boolean;
    currentStock: number;
    canFulfill: boolean;
  }> {
    const variant = await this.getVariant(variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }

    return {
      available: variant.is_available,
      currentStock: variant.stock_quantity,
      canFulfill: variant.is_available && variant.stock_quantity >= requestedQuantity
    };
  }

  // Update variant stock
  async updateVariantStock(
    variantId: string,
    quantityChange: number,
    operation: 'add' | 'subtract' = 'subtract'
  ): Promise<ProductVariant> {
    const multiplier = operation === 'add' ? 1 : -1;
    
    const { data, error } = await supabase
      .from('product_variants')
      .update({
        stock_quantity: ((await this.getVariant(variantId))?.stock_quantity || 0) + (quantityChange * multiplier)
      })
      .eq('id', variantId)
      .select()
      .single();

    if (error) throw error;
    return this.transformVariant(data);
  }

  // Get low stock variants
  async getLowStockVariants(threshold = 5): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from('product_variants')
      .select(`
        *,
        products!inner(title, image_url)
      `)
      .lte('stock_quantity', threshold)
      .eq('is_available', true)
      .order('stock_quantity');

    if (error) throw error;

    return (data || []).map(this.transformVariant);
  }

  // Get variant combinations for a product
  async getVariantCombinations(productId: string): Promise<Array<{
    combination: Record<string, string>;
    variant: ProductVariant | null;
    available: boolean;
    price: number;
  }>> {
    const variantTypes = await this.getVariantTypes(productId);
    
    if (variantTypes.length === 0) {
      return [];
    }

    // Generate all possible combinations
    const combinations: Array<Record<string, string>> = [];
    const generate = (index: number, current: Record<string, string>) => {
      if (index === variantTypes.length) {
        combinations.push({ ...current });
        return;
      }

      const currentType = variantTypes[index];
      for (const variant of currentType.variants) {
        current[currentType.type] = variant.variant_value;
        generate(index + 1, current);
      }
    };

    generate(0, {});

    // Match combinations with actual variants
    const variants = await this.getProductVariants(productId);
    
    return combinations.map(combination => {
      // Find matching variant (for single-attribute variants)
      const matchingVariant = variants.find(v => 
        v.variant_value === combination[v.variant_type]
      );

      return {
        combination,
        variant: matchingVariant || null,
        available: matchingVariant?.is_available || false,
        price: matchingVariant?.price_adjustment || 0
      };
    });
  }

  // Private helper to transform database result
  private transformVariant(data: any): ProductVariant {
    return {
      id: data.id,
      parent_product_id: data.parent_product_id,
      variant_name: data.variant_name,
      variant_type: data.variant_type,
      variant_value: data.variant_value,
      price_adjustment: Number(data.price_adjustment),
      sku: data.sku,
      stock_quantity: data.stock_quantity,
      weight: data.weight ? Number(data.weight) : undefined,
      dimensions: data.dimensions,
      is_available: data.is_available,
      created_at: data.created_at,
      updated_at: data.updated_at,
      sort_order: data.sort_order,
      image_url: data.image_url
    };
  }
}

export const variantService = new VariantService();