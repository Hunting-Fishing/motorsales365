// Module subscription configuration with tiered pricing
// Maps module slugs to their Stripe product/price IDs per tier

export type TierSlug = 'free' | 'starter' | 'pro' | 'business';

export interface TierConfig {
  name: string;
  price: number;
  limits: {
    work_orders_per_month: number; // -1 = unlimited
    invoices_per_month: number;
    customers: number;
    team_members: number;
    integrations: number;
  };
  features: string[];
}

export interface ModuleTierPricing {
  productId: string;
  priceId: string;
}

export interface ModuleConfig {
  slug: string;
  name: string;
  description: string;
  icon: string;
  tiers: {
    starter: ModuleTierPricing;
    pro: ModuleTierPricing;
    business: ModuleTierPricing;
  };
}

// Tier definitions with limits and features
export const TIER_CONFIGS: Record<TierSlug, TierConfig> = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      work_orders_per_month: 15,
      invoices_per_month: 0, // View only
      customers: 25,
      team_members: 1,
      integrations: 0,
    },
    features: ['basic_dashboard', 'customer_management'],
  },
  starter: {
    name: 'Starter',
    price: 9,
    limits: {
      work_orders_per_month: 50,
      invoices_per_month: 10,
      customers: 100,
      team_members: 2,
      integrations: 1,
    },
    features: ['basic_reports', 'email_support', 'invoicing'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    limits: {
      work_orders_per_month: -1, // Unlimited
      invoices_per_month: -1,
      customers: -1,
      team_members: 5,
      integrations: 3,
    },
    features: ['advanced_reports', 'api_access', 'priority_support', 'invoicing'],
  },
  business: {
    name: 'Business',
    price: 49,
    limits: {
      work_orders_per_month: -1,
      invoices_per_month: -1,
      customers: -1,
      team_members: -1,
      integrations: -1,
    },
    features: ['custom_reports', 'api_access', 'dedicated_support', 'white_label', 'invoicing'],
  },
};

// Module configurations with Stripe IDs for each tier
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  automotive: {
    slug: 'automotive',
    name: 'Large Repair Shop',
    description: 'Vehicle repair, maintenance, and diagnostic services',
    icon: 'Car',
    tiers: {
      starter: {
        productId: 'prod_TkHbDuJAyUjch9',
        priceId: 'price_1Smn1rGapOfsltWtDmAT3KPM',
      },
      pro: {
        productId: 'prod_TkHbtje5K3hM3U',
        priceId: 'price_1Smn2KGapOfsltWtqGgvKZ5p',
      },
      business: {
        productId: 'prod_TkHcZz0EzbYhgo',
        priceId: 'price_1Smn3KGapOfsltWtExYtmesn',
      },
    },
  },
  marine: {
    slug: 'marine',
    name: 'Marine Services',
    description: 'Boat repair, maintenance, and marine equipment services',
    icon: 'Anchor',
    tiers: {
      starter: {
        productId: 'prod_TkHfgZQcYSUY8C',
        priceId: 'price_1Smn6dGapOfsltWtzXMjR0q5',
      },
      pro: {
        productId: 'prod_TkHgia4T6L17EG',
        priceId: 'price_1Smn6qGapOfsltWtq0tMI2Z5',
      },
      business: {
        productId: 'prod_TkHgJD3fYTBFKb',
        priceId: 'price_1Smn76GapOfsltWtczRMrZvi',
      },
    },
  },
  fuel_delivery: {
    slug: 'fuel_delivery',
    name: 'Fuel Delivery',
    description: 'Fleet fueling, tank management, and mobile delivery operations',
    icon: 'Fuel',
    tiers: {
      starter: {
        productId: 'prod_Tp1qFFafyqiR0A',
        priceId: 'price_1SrNmjGapOfsltWt3fqBNwi7',
      },
      pro: {
        productId: 'prod_Tp1rcYd07x0rG3',
        priceId: 'price_1SrNnNGapOfsltWteieDKKaq',
      },
      business: {
        productId: 'prod_Tp1sjesmCwG75A',
        priceId: 'price_1SrNoYGapOfsltWtOOLw0ca7',
      },
    },
  },
  welding: {
    slug: 'welding',
    name: 'Welding & Fabrication',
    description: 'Complete welding and fabrication business management',
    icon: 'Flame',
    tiers: {
      starter: {
        productId: 'prod_UHsiqNS71nOLwD',
        priceId: 'price_1TJIwoGapOfsltWtTefAiclN',
      },
      pro: {
        productId: 'prod_UHsiGDGDogmPpL',
        priceId: 'price_1TJIxFGapOfsltWtoAoCR4ql',
      },
      business: {
        productId: 'prod_UHsjyUgrCnhurI',
        priceId: 'price_1TJIxeGapOfsltWtgnm3WZxT',
      },
    },
  },
};

// Multi-module discount: 20% off each additional module
export const MULTI_MODULE_DISCOUNT_PERCENT = 20;

/**
 * Calculate the price for a module based on how many modules
 * the user already has subscribed at the same tier
 */
export const calculateModulePrice = (
  tier: Exclude<TierSlug, 'free'>,
  existingModulesAtTier: number
): { basePrice: number; discountedPrice: number; savings: number } => {
  const basePrice = TIER_CONFIGS[tier].price;
  
  if (existingModulesAtTier === 0) {
    // First module at this tier: full price
    return { basePrice, discountedPrice: basePrice, savings: 0 };
  }
  
  // Additional modules get 20% off
  const discountedPrice = Math.round(basePrice * (1 - MULTI_MODULE_DISCOUNT_PERCENT / 100));
  const savings = basePrice - discountedPrice;
  
  return { basePrice, discountedPrice, savings };
};

/**
 * Calculate total monthly cost for multiple modules at the same tier
 */
export const calculateTotalMonthlyPrice = (
  tier: Exclude<TierSlug, 'free'>,
  moduleCount: number
): { total: number; savings: number } => {
  if (moduleCount === 0) return { total: 0, savings: 0 };
  
  const basePrice = TIER_CONFIGS[tier].price;
  const discountedPrice = Math.round(basePrice * (1 - MULTI_MODULE_DISCOUNT_PERCENT / 100));
  
  // First module full price, rest discounted
  const total = basePrice + (moduleCount - 1) * discountedPrice;
  const fullPrice = basePrice * moduleCount;
  const savings = fullPrice - total;
  
  return { total, savings };
};

export const getModuleConfig = (slug: string): ModuleConfig | undefined => {
  return MODULE_CONFIGS[slug];
};

export const getAllPurchasableModules = (): ModuleConfig[] => {
  return Object.values(MODULE_CONFIGS);
};

export const getTierConfig = (tier: TierSlug): TierConfig => {
  return TIER_CONFIGS[tier];
};

export const getPaidTiers = (): Array<Exclude<TierSlug, 'free'>> => {
  return ['starter', 'pro', 'business'];
};
