export const MODULE_STRIPE_PRICING = {
  'repair-shop': {
    starter: { productId: 'prod_Tp1Uf0PJ8o9oBS', priceId: 'price_1SrNR6GapOfsltWtbXrEap7p', price: 9 },
    pro: { productId: 'prod_Tp1UMv7Wn1B4Bz', priceId: 'price_1SrNRZGapOfsltWt0rAg5XgB', price: 15 },
    business: { productId: 'prod_Tp1VP5pdAqzpmn', priceId: 'price_1SrNSbGapOfsltWtSGOmgyTa', price: 25 },
  },
  'marine': {
    starter: { productId: 'prod_Tp1XBdCftUCHT0', priceId: 'price_1SrNUpGapOfsltWtPaPSW0Ig', price: 9 },
    pro: { productId: 'prod_Tp1YcP48Ot3eZg', priceId: 'price_1SrNV9GapOfsltWthGS0pGJY', price: 15 },
    business: { productId: 'prod_Tp1Y0PBE3Qtf8O', priceId: 'price_1SrNVfGapOfsltWtwangjN04', price: 25 },
  },
  'fuel-delivery': {
    starter: { productId: 'prod_Tp1qFFafyqiR0A', priceId: 'price_1SrNmjGapOfsltWt3fqBNwi7', price: 9 },
    pro: { productId: 'prod_Tp1rcYd07x0rG3', priceId: 'price_1SrNnNGapOfsltWteieDKKaq', price: 15 },
    business: { productId: 'prod_Tp1sjesmCwG75A', priceId: 'price_1SrNoYGapOfsltWtOOLw0ca7', price: 25 },
  },
} as const;

export type ModuleId = keyof typeof MODULE_STRIPE_PRICING;
export type TierType = 'starter' | 'pro' | 'business';

// Build product-to-plan mapping from all modules
export const PRODUCT_PLAN_MAP: Record<string, TierType> = {};
Object.values(MODULE_STRIPE_PRICING).forEach(module => {
  Object.entries(module).forEach(([tier, data]) => {
    PRODUCT_PLAN_MAP[data.productId] = tier as TierType;
  });
});

// Helper to get all product IDs for subscription checking
export const ALL_PRODUCT_IDS = Object.values(MODULE_STRIPE_PRICING)
  .flatMap(module => Object.values(module))
  .map(tier => tier.productId);
