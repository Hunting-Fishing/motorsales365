import { useState, useEffect, useCallback } from 'react';
import { AffiliateTool } from '@/types/affiliate';
import { ProductBundle, ProductVariant, PricingRule } from '@/types/advanced-product';
import { bundleService } from '@/services/advanced-product/bundleService';
import { variantService } from '@/services/advanced-product/variantService';
import { pricingService } from '@/services/advanced-product/pricingService';
import { useProductsManager } from '@/hooks/affiliate/useProductsManager';

interface UseAdvancedProductsReturn {
  // Base products
  products: AffiliateTool[];
  loading: boolean;
  error: string | null;
  
  // Bundles
  bundles: ProductBundle[];
  loadingBundles: boolean;
  bundleError: string | null;
  
  // Variants
  variants: Record<string, ProductVariant[]>;
  loadingVariants: boolean;
  variantError: string | null;
  
  // Pricing
  pricingRules: PricingRule[];
  loadingPricing: boolean;
  pricingError: string | null;
  
  // Actions
  refreshProducts: () => Promise<void>;
  refreshBundles: () => Promise<void>;
  refreshVariants: (productId: string) => Promise<void>;
  refreshPricing: () => Promise<void>;
  
  // Calculations
  calculateProductPrice: (productId: string, quantity?: number) => Promise<number>;
  calculateBundlePrice: (bundleId: string) => Promise<{ bundle_price: number; savings: number }>;
  checkVariantStock: (variantId: string, quantity: number) => Promise<boolean>;
}

export function useAdvancedProducts(): UseAdvancedProductsReturn {
  // Base products from existing hook
  const { products, loading, error } = useProductsManager();
  
  // Bundles state
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  
  // Variants state
  const [variants, setVariants] = useState<Record<string, ProductVariant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  
  // Pricing state
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Load bundles
  const refreshBundles = useCallback(async () => {
    try {
      setLoadingBundles(true);
      setBundleError(null);
      const bundleData = await bundleService.getBundles({ limit: 100 });
      setBundles(bundleData);
    } catch (error) {
      console.error('Error loading bundles:', error);
      setBundleError(error instanceof Error ? error.message : 'Failed to load bundles');
    } finally {
      setLoadingBundles(false);
    }
  }, []);

  // Load variants for a specific product
  const refreshVariants = useCallback(async (productId: string) => {
    try {
      setLoadingVariants(true);
      setVariantError(null);
      const variantTypes = await variantService.getVariantTypes(productId);
      const productVariants = variantTypes.flatMap(type => type.variants);
      setVariants(prev => ({
        ...prev,
        [productId]: productVariants
      }));
    } catch (error) {
      console.error('Error loading variants:', error);
      setVariantError(error instanceof Error ? error.message : 'Failed to load variants');
    } finally {
      setLoadingVariants(false);
    }
  }, []);

  // Load pricing rules
  const refreshPricing = useCallback(async () => {
    try {
      setLoadingPricing(true);
      setPricingError(null);
      
      // Load pricing rules with basic filter
      const dynamicRules = await pricingService.getPricingRules({});
      setPricingRules(dynamicRules.filter(rule => rule.is_active));
      
    } catch (error) {
      console.error('Error loading pricing rules:', error);
      setPricingError(error instanceof Error ? error.message : 'Failed to load pricing rules');
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  // Refresh all products (delegates to base hook)
  const refreshProducts = useCallback(async () => {
    // This would trigger a refresh in the base hook
    // For now, we'll just refresh our advanced features
    await Promise.all([
      refreshBundles(),
      refreshPricing()
    ]);
  }, [refreshBundles, refreshPricing]);

  // Calculate basic product price
  const calculateProductPrice = useCallback(async (
    productId: string, 
    quantity: number = 1
  ): Promise<number> => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return 0;

      let finalPrice = product.price || 0;

      // Apply basic pricing rules (simplified)
      for (const rule of pricingRules) {
        if (rule.target_id === productId) {
          try {
            const calculation = await pricingService.calculatePrice(rule.id, finalPrice);
            finalPrice = calculation.discounted_price || finalPrice;
          } catch (error) {
            // If pricing calculation fails, keep original price
            console.error('Error applying pricing rule:', error);
          }
        }
      }

      return finalPrice;
    } catch (error) {
      console.error('Error calculating product price:', error);
      return products.find(p => p.id === productId)?.price || 0;
    }
  }, [products, pricingRules]);

  // Calculate bundle price
  const calculateBundlePrice = useCallback(async (bundleId: string) => {
    try {
      const calculation = await bundleService.calculateBundlePrice(bundleId);
      return { 
        bundle_price: calculation.bundle_price, 
        savings: calculation.total_savings || 0 
      };
    } catch (error) {
      console.error('Error calculating bundle price:', error);
      return { bundle_price: 0, savings: 0 };
    }
  }, []);

  // Check variant stock
  const checkVariantStock = useCallback(async (variantId: string, quantity: number): Promise<boolean> => {
    try {
      const stockInfo = await variantService.checkVariantStock(variantId, quantity);
      return stockInfo.canFulfill;
    } catch (error) {
      console.error('Error checking variant stock:', error);
      return false;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    refreshBundles();
    refreshPricing();
  }, [refreshBundles, refreshPricing]);

  return {
    // Base products
    products,
    loading,
    error,
    
    // Bundles
    bundles,
    loadingBundles,
    bundleError,
    
    // Variants
    variants,
    loadingVariants,
    variantError,
    
    // Pricing
    pricingRules,
    loadingPricing,
    pricingError,
    
    // Actions
    refreshProducts,
    refreshBundles,
    refreshVariants,
    refreshPricing,
    
    // Calculations
    calculateProductPrice,
    calculateBundlePrice,
    checkVariantStock
  };
}