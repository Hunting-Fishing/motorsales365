// Dynamic Pricing Service
import { supabase } from '@/integrations/supabase/client';
import { PricingRule, PricingRuleFormData, PriceCalculation } from '@/types/advanced-product';

export class PricingService {
  // Get all active pricing rules
  async getPricingRules(filters?: {
    target_type?: string;
    target_id?: string;
    rule_type?: string;
  }): Promise<PricingRule[]> {
    let query = supabase
      .from('pricing_rules')
      .select('*')
      .eq('is_active', true);

    if (filters?.target_type) {
      query = query.eq('target_type', filters.target_type);
    }

    if (filters?.target_id) {
      query = query.eq('target_id', filters.target_id);
    }

    if (filters?.rule_type) {
      query = query.eq('rule_type', filters.rule_type);
    }

    query = query.order('priority', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as PricingRule[];
  }

  // Create pricing rule
  async createPricingRule(ruleData: PricingRuleFormData): Promise<PricingRule> {
    const { data, error } = await supabase
      .from('pricing_rules')
      .insert({
        ...ruleData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as PricingRule;
  }

  // Update pricing rule
  async updatePricingRule(id: string, ruleData: Partial<PricingRuleFormData>): Promise<PricingRule> {
    const { data, error } = await supabase
      .from('pricing_rules')
      .update(ruleData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PricingRule;
  }

  // Delete pricing rule
  async deletePricingRule(id: string): Promise<void> {
    const { error } = await supabase
      .from('pricing_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Calculate dynamic price for a product
  async calculatePrice(
    productId: string,
    basePrice: number,
    context: {
      quantity?: number;
      customerTier?: string;
      categoryId?: string;
      currentStock?: number;
      userId?: string;
    } = {}
  ): Promise<PriceCalculation> {
    // Get applicable rules for this product
    const productRules = await this.getPricingRules({
      target_type: 'product',
      target_id: productId
    });

    // Get category rules if category provided
    let categoryRules: PricingRule[] = [];
    if (context.categoryId) {
      categoryRules = await this.getPricingRules({
        target_type: 'category',
        target_id: context.categoryId
      });
    }

    // Combine and sort rules by priority
    const allRules = [...productRules, ...categoryRules]
      .sort((a, b) => b.priority - a.priority);

    const applicableRules: PricingRule[] = [];
    let currentPrice = basePrice;
    let totalDiscount = 0;

    const now = new Date();

    for (const rule of allRules) {
      // Check if rule is within date range
      if (rule.start_date && new Date(rule.start_date) > now) continue;
      if (rule.end_date && new Date(rule.end_date) < now) continue;

      // Check if rule has usage limit
      if (rule.usage_limit && rule.usage_count >= rule.usage_limit) continue;

      // Check rule conditions
      if (!this.evaluateRuleConditions(rule, context, now)) continue;

      // Apply rule
      const discount = this.applyPricingRule(rule, currentPrice, context.quantity || 1);
      if (discount > 0) {
        applicableRules.push(rule);
        totalDiscount += discount;
        currentPrice -= discount;

        // Update usage count
        await this.incrementRuleUsage(rule.id);
      }
    }

    return {
      base_price: basePrice,
      discounted_price: Math.max(0, currentPrice),
      discount_amount: totalDiscount,
      discount_percentage: basePrice > 0 ? (totalDiscount / basePrice) * 100 : 0,
      applied_rules: applicableRules
    };
  }

  // Calculate bulk pricing
  async calculateBulkPrice(
    productId: string,
    basePrice: number,
    quantity: number,
    customerTier?: string
  ): Promise<PriceCalculation['bulk_discount']> {
    const { data: bulkPricing, error } = await supabase
      .from('bulk_pricing')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .lte('minimum_quantity', quantity)
      .or(`maximum_quantity.is.null,maximum_quantity.gte.${quantity}`)
      .order('minimum_quantity', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!bulkPricing || bulkPricing.length === 0) {
      return undefined;
    }

    const pricing = bulkPricing[0];

    // Check customer tier if specified
    if (pricing.customer_tier && customerTier && pricing.customer_tier !== customerTier) {
      return undefined;
    }

    const originalPrice = basePrice * quantity;
    let bulkPrice = originalPrice;

    switch (pricing.discount_type) {
      case 'percentage':
        bulkPrice = originalPrice * (1 - pricing.discount_value / 100);
        break;
      case 'fixed_amount':
        bulkPrice = originalPrice - pricing.discount_value;
        break;
      case 'fixed_price':
        bulkPrice = pricing.discount_value * quantity;
        break;
    }

    bulkPrice = Math.max(0, bulkPrice);
    const savings = originalPrice - bulkPrice;

    return {
      original_price: originalPrice,
      bulk_price: bulkPrice,
      savings,
      tier: pricing.customer_tier || 'retail'
    };
  }

  // Private helper methods
  private evaluateRuleConditions(
    rule: PricingRule,
    context: any,
    now: Date
  ): boolean {
    const conditions = rule.conditions;

    // Time-based conditions
    if (rule.rule_type === 'time_based') {
      if (conditions.time_start && conditions.time_end) {
        const timeStart = new Date(`1970-01-01T${conditions.time_start}`);
        const timeEnd = new Date(`1970-01-01T${conditions.time_end}`);
        const currentTime = new Date(`1970-01-01T${now.toTimeString().slice(0, 8)}`);
        
        if (currentTime < timeStart || currentTime > timeEnd) {
          return false;
        }
      }

      if (conditions.day_of_week && conditions.day_of_week.length > 0) {
        const currentDay = now.getDay();
        if (!conditions.day_of_week.includes(currentDay)) {
          return false;
        }
      }
    }

    // Quantity-based conditions
    if (rule.rule_type === 'quantity_based') {
      const quantity = context.quantity || 1;
      if (conditions.quantity_min && quantity < conditions.quantity_min) {
        return false;
      }
      if (conditions.quantity_max && quantity > conditions.quantity_max) {
        return false;
      }
    }

    // Customer tier conditions
    if (rule.rule_type === 'customer_tier') {
      if (conditions.customer_tiers && conditions.customer_tiers.length > 0) {
        if (!context.customerTier || !conditions.customer_tiers.includes(context.customerTier)) {
          return false;
        }
      }
    }

    // Inventory-based conditions
    if (rule.rule_type === 'inventory_based') {
      if (conditions.inventory_threshold && context.currentStock !== undefined) {
        if (context.currentStock > conditions.inventory_threshold) {
          return false;
        }
      }
    }

    return true;
  }

  private applyPricingRule(rule: PricingRule, currentPrice: number, quantity: number): number {
    const actions = rule.actions;
    let discount = 0;

    switch (actions.discount_type) {
      case 'percentage':
        discount = currentPrice * (actions.discount_value / 100);
        break;
      case 'fixed_amount':
        discount = actions.discount_value;
        break;
      case 'fixed_price':
        discount = currentPrice - actions.discount_value;
        break;
    }

    // Apply maximum discount if specified
    if (actions.max_discount && discount > actions.max_discount) {
      discount = actions.max_discount;
    }

    // Apply to order vs item
    if (actions.apply_to === 'order') {
      discount = discount / quantity;
    }

    return Math.max(0, discount);
  }

  private async incrementRuleUsage(ruleId: string): Promise<void> {
    // Get current count and increment
    const { data: currentRule } = await supabase
      .from('pricing_rules')
      .select('usage_count')
      .eq('id', ruleId)
      .single();

    const newCount = (currentRule?.usage_count || 0) + 1;

    await supabase
      .from('pricing_rules')
      .update({ usage_count: newCount })
      .eq('id', ruleId);
  }
}

export const pricingService = new PricingService();