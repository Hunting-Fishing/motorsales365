
export interface LoyaltySettings {
  id: string;
  shop_id: string;
  is_enabled: boolean;
  points_per_dollar: number;
  points_expiration_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerLoyalty {
  id: string;
  customer_id: string;
  current_points: number;
  lifetime_points: number;
  lifetime_value: number;
  tier: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyReward {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  points_cost: number;
  is_active: boolean;
  reward_type: 'discount' | 'service' | 'product' | 'other';
  reward_value?: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'adjust';
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_at: string;
}

export interface LoyaltyRedemption {
  id: string;
  customer_id: string;
  reward_id: string;
  points_used: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  used_at?: string;
  created_at: string;
  updated_at: string;
  reward?: LoyaltyReward;
}

export interface LoyaltyTier {
  id?: string; // Added the id property
  name: string;
  threshold: number;
  benefits: string;
  multiplier?: number;
  color?: string;
  shop_id?: string; // Added shop_id property
}

// DEPRECATED: Use loyaltySettingsService.getTierTemplates() instead
// This is kept for backward compatibility but will be removed in future versions
export const DEFAULT_LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: "Standard",
    threshold: 0,
    benefits: "Basic loyalty program benefits",
    multiplier: 1,
    color: "green"
  },
  {
    name: "Silver",
    threshold: 1000,
    benefits: "5% additional points on all purchases, priority scheduling",
    multiplier: 1.05,
    color: "blue"
  },
  {
    name: "Gold",
    threshold: 5000,
    benefits: "10% additional points on all purchases, priority scheduling, free courtesy vehicles",
    multiplier: 1.1,
    color: "purple"
  },
  {
    name: "Platinum",
    threshold: 10000,
    benefits: "15% additional points on all purchases, VIP service, free courtesy vehicles, complimentary inspections",
    multiplier: 1.15,
    color: "amber"
  }
];

// Helper function for easier migration
export async function getLoyaltyTiers() {
  const { loyaltySettingsService } = await import('@/services/settings/loyaltySettingsService');
  return await loyaltySettingsService.getTierTemplates();
}
