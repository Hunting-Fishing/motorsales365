// Phase 5: Advanced Product Features Types

export interface ProductBundle {
  id: string;
  name: string;
  description?: string;
  bundle_type: 'fixed' | 'dynamic' | 'custom';
  base_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  minimum_quantity: number;
  maximum_quantity?: number;
  category_id?: string;
  tags?: string[];
  image_url?: string;
  is_featured: boolean;
  items?: BundleItem[];
  calculated_price?: number;
  savings?: number;
}

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  is_required: boolean;
  display_order: number;
  custom_price?: number;
  created_at: string;
  product?: {
    id: string;
    name: string;
    title: string;
    price: number;
    image_url: string;
    description: string;
  };
}

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  rule_type: 'time_based' | 'quantity_based' | 'customer_tier' | 'inventory_based';
  target_type: 'product' | 'category' | 'bundle';
  target_id?: string;
  conditions: {
    time_start?: string;
    time_end?: string;
    quantity_min?: number;
    quantity_max?: number;
    customer_tiers?: string[];
    inventory_threshold?: number;
    day_of_week?: number[];
    [key: string]: any;
  };
  actions: {
    discount_type: 'percentage' | 'fixed_amount' | 'fixed_price';
    discount_value: number;
    max_discount?: number;
    apply_to?: 'item' | 'order';
    [key: string]: any;
  };
  priority: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  usage_limit?: number;
  usage_count: number;
}

export interface ProductVariant {
  id: string;
  parent_product_id: string;
  variant_name: string;
  variant_type: 'size' | 'color' | 'material' | 'specification';
  variant_value: string;
  price_adjustment: number;
  sku?: string;
  stock_quantity: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  is_available: boolean;
  created_at: string;
  updated_at: string;
  sort_order: number;
  image_url?: string;
  calculated_price?: number;
}

export interface BulkPricing {
  id: string;
  product_id?: string;
  bundle_id?: string;
  variant_id?: string;
  minimum_quantity: number;
  maximum_quantity?: number;
  discount_type: 'percentage' | 'fixed_amount' | 'fixed_price';
  discount_value: number;
  customer_tier?: 'retail' | 'wholesale' | 'contractor' | 'distributor';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryAlert {
  id: string;
  product_id?: string;
  variant_id?: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstocked' | 'reorder_point';
  threshold_value: number;
  current_value: number;
  status: 'active' | 'acknowledged' | 'resolved';
  message?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  resolved_at?: string;
  notification_sent: boolean;
  product?: {
    title: string;
    image_url?: string;
  };
  variant?: {
    variant_name: string;
    variant_value: string;
  };
}

export interface ProductInteractionAnalytics {
  id: string;
  product_id: string;
  variant_id?: string;
  bundle_id?: string;
  user_id?: string;
  session_id?: string;
  interaction_type: 'view' | 'click' | 'add_to_cart' | 'purchase' | 'save' | 'share' | 'compare';
  interaction_data: {
    quantity?: number;
    price?: number;
    variant_selected?: string;
    referrer?: string;
    search_query?: string;
    [key: string]: any;
  };
  referrer_url?: string;
  user_agent?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
  location_data?: {
    country?: string;
    region?: string;
    city?: string;
  };
  created_at: string;
  revenue_generated: number;
}

// Form interfaces for creating/updating
export interface BundleFormData {
  name: string;
  description?: string;
  bundle_type: 'fixed' | 'dynamic' | 'custom';
  base_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  minimum_quantity: number;
  maximum_quantity?: number;
  category_id?: string;
  tags?: string[];
  image_url?: string;
  is_featured: boolean;
  start_date?: string;
  end_date?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    is_required: boolean;
    display_order: number;
    custom_price?: number;
  }>;
}

export interface PricingRuleFormData {
  name: string;
  description?: string;
  rule_type: 'time_based' | 'quantity_based' | 'customer_tier' | 'inventory_based';
  target_type: 'product' | 'category' | 'bundle';
  target_id?: string;
  conditions: any;
  actions: any;
  priority: number;
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
}

export interface VariantFormData {
  parent_product_id: string;
  variant_name: string;
  variant_type: 'size' | 'color' | 'material' | 'specification';
  variant_value: string;
  price_adjustment: number;
  sku?: string;
  stock_quantity: number;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  sort_order: number;
  image_url?: string;
}

// Enhanced product with advanced features
export interface EnhancedProduct {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  variants?: ProductVariant[];
  bulk_pricing?: BulkPricing[];
  dynamic_price?: number;
  applicable_rules?: PricingRule[];
  bundles?: ProductBundle[];
  analytics?: {
    total_views: number;
    total_interactions: number;
    conversion_rate: number;
    revenue_generated: number;
  };
}

// Pricing calculation helpers
export interface PriceCalculation {
  base_price: number;
  discounted_price: number;
  discount_amount: number;
  discount_percentage: number;
  applied_rules: PricingRule[];
  bulk_discount?: {
    original_price: number;
    bulk_price: number;
    savings: number;
    tier: string;
  };
}

export interface BundleCalculation {
  individual_total: number;
  bundle_price: number;
  total_savings: number;
  savings_percentage: number;
  items: Array<{
    product_id: string;
    name: string;
    individual_price: number;
    bundle_price: number;
    quantity: number;
  }>;
}