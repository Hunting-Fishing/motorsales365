export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  category: string;
  manufacturer: string;
  variantId?: string;
  variantName?: string;
  bundleId?: string;
  bundleName?: string;
  originalPrice?: number;
  appliedDiscounts?: string[];
}

export interface CartVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface CartBundle {
  id: string;
  name: string;
  price: number;
  discount: number;
  items: Array<{
    productId: string;
    quantity: number;
    variantId?: string;
  }>;
}

export interface DynamicPricing {
  originalPrice: number;
  finalPrice: number;
  savings: number;
  appliedDiscounts: string[];
  breakdown: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
}

export interface BulkPricingTier {
  name: string;
  minQuantity: number;
  maxQuantity?: number;
  discountPercent: number;
  discountAmount?: number;
}