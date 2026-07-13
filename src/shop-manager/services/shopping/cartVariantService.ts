import { supabase } from '@/integrations/supabase/client';
import { ProductVariant } from '@/types/advanced-product';
import { pricingService } from '@/services/advanced-product/pricingService';

export interface CartItemWithVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
  quantity: number;
  category: string;
  manufacturer: string;
  variantId?: string;
  variantName?: string;
  variantValue?: string;
  bundleId?: string;
  bundleName?: string;
  appliedDiscounts?: string[];
  dynamicPrice?: number;
}

export class CartVariantService {
  // Get product variants for cart items
  async getProductVariants(productIds: string[]): Promise<Map<string, ProductVariant[]>> {
    try {
      const { data: variants, error } = await supabase
        .from('product_variants')
        .select('*')
        .in('parent_product_id', productIds)
        .eq('is_available', true)
        .order('sort_order');

      if (error) throw error;

      const variantMap = new Map<string, ProductVariant[]>();
      
      (variants || []).forEach(variant => {
        const productId = variant.parent_product_id;
        if (!variantMap.has(productId)) {
          variantMap.set(productId, []);
        }
        variantMap.get(productId)!.push(variant as ProductVariant);
      });

      return variantMap;
    } catch (error) {
      console.error('Error fetching product variants:', error);
      return new Map();
    }
  }

  // Calculate dynamic pricing for cart items
  async calculateCartItemPricing(
    items: CartItemWithVariant[],
    userId?: string
  ): Promise<CartItemWithVariant[]> {
    const updatedItems: CartItemWithVariant[] = [];

    for (const item of items) {
      try {
        let basePrice = item.originalPrice || item.price;
        
        // Apply variant pricing
        if (item.variantId) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('price_adjustment')
            .eq('id', item.variantId)
            .single();
            
          if (variant) {
            basePrice += variant.price_adjustment;
          }
        }

        // Calculate dynamic pricing
        const priceCalculation = await pricingService.calculatePrice(
          item.productId,
          basePrice,
          {
            quantity: item.quantity,
            userId,
            categoryId: item.category
          }
        );

        // Calculate bulk pricing if applicable
        const bulkPricing = await pricingService.calculateBulkPrice(
          item.productId,
          basePrice,
          item.quantity
        );

        const finalPrice = Math.min(
          priceCalculation.discounted_price,
          bulkPricing?.bulk_price || priceCalculation.discounted_price
        );

        const appliedDiscounts: string[] = [];
        
        // Track applied discount rules
        priceCalculation.applied_rules.forEach(rule => {
          appliedDiscounts.push(rule.name);
        });

        if (bulkPricing && bulkPricing.savings > 0) {
          appliedDiscounts.push(`Bulk discount (${item.quantity}+ items)`);
        }

        updatedItems.push({
          ...item,
          price: finalPrice,
          originalPrice: basePrice,
          dynamicPrice: finalPrice,
          appliedDiscounts
        });
      } catch (error) {
        console.error(`Error calculating pricing for item ${item.id}:`, error);
        // Fallback to original item if pricing calculation fails
        updatedItems.push(item);
      }
    }

    return updatedItems;
  }

  // Add variant information to cart item
  async enhanceCartItemWithVariant(
    cartItem: any,
    variantId?: string
  ): Promise<CartItemWithVariant> {
    let variantInfo = null;
    
    if (variantId) {
      try {
        const { data: variant } = await supabase
          .from('product_variants')
          .select('*')
          .eq('id', variantId)
          .single();
          
        variantInfo = variant;
      } catch (error) {
        console.error('Error fetching variant info:', error);
      }
    }

    return {
      id: cartItem.id,
      productId: cartItem.product_id,
      name: cartItem.name,
      price: cartItem.price,
      originalPrice: cartItem.price,
      imageUrl: variantInfo?.image_url || cartItem.image_url,
      quantity: cartItem.quantity,
      category: cartItem.category,
      manufacturer: cartItem.manufacturer,
      variantId: variantInfo?.id,
      variantName: variantInfo?.variant_name,
      variantValue: variantInfo?.variant_value,
      appliedDiscounts: []
    };
  }

  // Get available variants for a product in cart context
  async getAvailableVariantsForProduct(productId: string): Promise<ProductVariant[]> {
    try {
      const { data: variants, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('parent_product_id', productId)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .order('sort_order');

      if (error) throw error;
      return (variants || []) as ProductVariant[];
    } catch (error) {
      console.error('Error fetching available variants:', error);
      return [];
    }
  }

  // Validate variant availability before adding to cart
  async validateVariantAvailability(
    variantId: string,
    requestedQuantity: number
  ): Promise<{ available: boolean; maxQuantity: number; message?: string }> {
    try {
      const { data: variant, error } = await supabase
        .from('product_variants')
        .select('stock_quantity, is_available')
        .eq('id', variantId)
        .single();

      if (error || !variant) {
        return {
          available: false,
          maxQuantity: 0,
          message: 'Variant not found'
        };
      }

      if (!variant.is_available) {
        return {
          available: false,
          maxQuantity: 0,
          message: 'This variant is no longer available'
        };
      }

      if (variant.stock_quantity < requestedQuantity) {
        return {
          available: variant.stock_quantity > 0,
          maxQuantity: variant.stock_quantity,
          message: `Only ${variant.stock_quantity} items available`
        };
      }

      return {
        available: true,
        maxQuantity: variant.stock_quantity
      };
    } catch (error) {
      console.error('Error validating variant availability:', error);
      return {
        available: false,
        maxQuantity: 0,
        message: 'Error checking availability'
      };
    }
  }
}

export const cartVariantService = new CartVariantService();

// Utility functions for cart pricing
export function calculateDynamicPrice(
  basePrice: number, 
  options: {
    quantity: number;
    customerTier: string;
    appliedDiscounts: string[];
  }
): { finalPrice: number; appliedDiscounts: string[] } {
  let finalPrice = basePrice;
  const appliedDiscounts: string[] = [...options.appliedDiscounts];

  // Apply customer tier discounts
  if (options.customerTier === 'premium') {
    finalPrice *= 0.95; // 5% discount for premium customers
    appliedDiscounts.push('Premium Customer (5%)');
  }

  // Apply bulk discounts
  const bulkTier = getBulkPricingTier(options.quantity);
  if (bulkTier) {
    finalPrice *= (1 - bulkTier.discountPercent / 100);
    appliedDiscounts.push(bulkTier.name);
  }

  return { finalPrice: Math.round(finalPrice * 100) / 100, appliedDiscounts };
}

export function getBulkPricingTier(quantity: number): { name: string; discountPercent: number } | null {
  if (quantity >= 10) {
    return { name: 'Bulk Discount (10+ items): 10%', discountPercent: 10 };
  }
  if (quantity >= 5) {
    return { name: 'Bulk Discount (5+ items): 5%', discountPercent: 5 };
  }
  return null;
}