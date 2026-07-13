import { supabase } from '@/integrations/supabase/client';
import { unifiedSettingsService } from '@/services/unified/unifiedSettingsService';
import { LoyaltyTier } from '@/types/loyalty';

export interface LoyaltyConfiguration {
  enabled: boolean;
  pointsPerDollar: number;
  pointsExpirationDays: number;
  tierTemplates: LoyaltyTier[];
}

class LoyaltySettingsService {
  private readonly CATEGORY = 'loyalty';

  private async getShopId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();

    if (error || !profile?.shop_id) {
      throw new Error('Shop not found for user');
    }

    return profile.shop_id;
  }

  async getConfiguration(): Promise<LoyaltyConfiguration> {
    try {
      const shopId = await this.getShopId();
      const [enabled, pointsPerDollar, pointsExpirationDays, tierTemplates] = await Promise.all([
        unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'enabled', false),
        unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'points_per_dollar', 1),
        unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'points_expiration_days', 365),
        unifiedSettingsService.getSetting(shopId, this.CATEGORY, 'tier_templates', this.getFallbackTiers()),
      ]);

      return {
        enabled,
        pointsPerDollar,
        pointsExpirationDays,
        tierTemplates
      };
    } catch (error) {
      console.error('Error fetching loyalty configuration:', error);
      return {
        enabled: false,
        pointsPerDollar: 1,
        pointsExpirationDays: 365,
        tierTemplates: this.getFallbackTiers()
      };
    }
  }

  async getTierTemplates(): Promise<LoyaltyTier[]> {
    try {
      const shopId = await this.getShopId();
      const tierTemplates = await unifiedSettingsService.getSetting(
        shopId, 
        this.CATEGORY, 
        'tier_templates', 
        this.getFallbackTiers()
      );
      return tierTemplates;
    } catch (error) {
      console.error('Error fetching loyalty tier templates:', error);
      return this.getFallbackTiers();
    }
  }

  async updateConfiguration(config: Partial<LoyaltyConfiguration>): Promise<void> {
    const shopId = await this.getShopId();
    const updates = [];

    if (config.enabled !== undefined) {
      updates.push(unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'enabled', config.enabled));
    }

    if (config.pointsPerDollar !== undefined) {
      updates.push(unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'points_per_dollar', config.pointsPerDollar));
    }

    if (config.pointsExpirationDays !== undefined) {
      updates.push(unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'points_expiration_days', config.pointsExpirationDays));
    }

    if (config.tierTemplates !== undefined) {
      updates.push(unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'tier_templates', config.tierTemplates));
    }

    await Promise.all(updates);
  }

  async updateTierTemplates(tierTemplates: LoyaltyTier[]): Promise<void> {
    const shopId = await this.getShopId();
    await unifiedSettingsService.setSetting(shopId, this.CATEGORY, 'tier_templates', tierTemplates);
  }

  private getFallbackTiers(): LoyaltyTier[] {
    return [
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
  }
}

export const loyaltySettingsService = new LoyaltySettingsService();