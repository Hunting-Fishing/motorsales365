import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { TrendingDown, Clock, Users, Package, Info } from 'lucide-react';
import { PriceCalculation, PricingRule, BulkPricing } from '@/types/advanced-product';
import { formatCurrency } from '@/lib/utils';
import { pricingService } from '@/services/advanced-product/pricingService';

interface DynamicPricingDisplayProps {
  productId: string;
  basePrice: number;
  quantity?: number;
  customerTier?: string;
  categoryId?: string;
  currentStock?: number;
  userId?: string;
  showBreakdown?: boolean;
  compact?: boolean;
}

export const DynamicPricingDisplay: React.FC<DynamicPricingDisplayProps> = ({
  productId,
  basePrice,
  quantity = 1,
  customerTier,
  categoryId,
  currentStock,
  userId,
  showBreakdown = true,
  compact = false
}) => {
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [bulkPricing, setBulkPricing] = useState<PriceCalculation['bulk_discount'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculateDynamicPrice();
  }, [productId, basePrice, quantity, customerTier, categoryId, currentStock]);

  const calculateDynamicPrice = async () => {
    try {
      setLoading(true);
      setError(null);

      const context = {
        quantity,
        customerTier,
        categoryId,
        currentStock,
        userId
      };

      // Calculate dynamic pricing
      const calculation = await pricingService.calculatePrice(
        productId,
        basePrice,
        context
      );

      setPriceCalculation(calculation);

      // Calculate bulk pricing if quantity > 1
      if (quantity > 1) {
        const bulk = await pricingService.calculateBulkPrice(
          productId,
          basePrice,
          quantity,
          customerTier
        );
        setBulkPricing(bulk);
      } else {
        setBulkPricing(null);
      }
    } catch (err) {
      setError('Failed to calculate pricing');
      console.error('Pricing calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRuleTypeIcon = (ruleType: string) => {
    switch (ruleType) {
      case 'time_based':
        return <Clock className="h-3 w-3" />;
      case 'customer_tier':
        return <Users className="h-3 w-3" />;
      case 'inventory_based':
        return <Package className="h-3 w-3" />;
      default:
        return <TrendingDown className="h-3 w-3" />;
    }
  };

  const getRuleTypeLabel = (ruleType: string) => {
    switch (ruleType) {
      case 'time_based':
        return 'Time-based Discount';
      case 'quantity_based':
        return 'Quantity Discount';
      case 'customer_tier':
        return 'Customer Tier Discount';
      case 'inventory_based':
        return 'Clearance Discount';
      default:
        return 'Special Discount';
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-3 w-16 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!priceCalculation) {
    return (
      <div className="space-y-1">
        <div className="text-lg font-bold">
          {formatCurrency(basePrice * quantity)}
        </div>
        {quantity > 1 && (
          <div className="text-sm text-muted-foreground">
            {formatCurrency(basePrice)} each
          </div>
        )}
      </div>
    );
  }

  const finalPrice = Math.max(
    priceCalculation.discounted_price * quantity,
    bulkPricing?.bulk_price || priceCalculation.discounted_price * quantity
  );

  const totalSavings = (basePrice * quantity) - finalPrice;
  const savingsPercentage = totalSavings > 0 ? (totalSavings / (basePrice * quantity)) * 100 : 0;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">
            {formatCurrency(finalPrice)}
          </span>
          {totalSavings > 0 && (
            <Badge variant="destructive" className="text-xs">
              Save {formatCurrency(totalSavings)}
            </Badge>
          )}
        </div>
        {quantity > 1 && (
          <div className="text-sm text-muted-foreground">
            {formatCurrency(finalPrice / quantity)} each
          </div>
        )}
        {totalSavings > 0 && (
          <div className="text-sm text-muted-foreground line-through">
            {formatCurrency(basePrice * quantity)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-4 w-4" />
          Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Price Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatCurrency(finalPrice)}
            </span>
            {totalSavings > 0 && (
              <Badge variant="destructive" className="text-sm">
                {savingsPercentage.toFixed(0)}% OFF
              </Badge>
            )}
          </div>
          
          {quantity > 1 && (
            <div className="text-sm text-muted-foreground">
              {formatCurrency(finalPrice / quantity)} per item
            </div>
          )}
          
          {totalSavings > 0 && (
            <div className="text-sm text-muted-foreground line-through">
              Regular: {formatCurrency(basePrice * quantity)}
            </div>
          )}
        </div>

        {/* Applied Discounts */}
        {(priceCalculation.applied_rules.length > 0 || bulkPricing) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Info className="h-3 w-3" />
                Active Discounts
              </h4>
              
              {priceCalculation.applied_rules.map((rule, index) => (
                <div key={rule.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getRuleTypeIcon(rule.rule_type)}
                    <span>{rule.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {rule.actions.discount_type === 'percentage' 
                      ? `${rule.actions.discount_value}% off`
                      : formatCurrency(rule.actions.discount_value)
                    }
                  </Badge>
                </div>
              ))}
              
              {bulkPricing && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    <span>Bulk Pricing ({quantity}+ items)</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Save {formatCurrency(bulkPricing.savings)}
                  </Badge>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pricing Breakdown */}
        {showBreakdown && totalSavings > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Price Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Base Price ({quantity}x {formatCurrency(basePrice)}):</span>
                  <span>{formatCurrency(basePrice * quantity)}</span>
                </div>
                
                {priceCalculation.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Dynamic Discounts:</span>
                    <span>-{formatCurrency(priceCalculation.discount_amount * quantity)}</span>
                  </div>
                )}
                
                {bulkPricing && (
                  <div className="flex justify-between text-green-600">
                    <span>Bulk Discount:</span>
                    <span>-{formatCurrency(bulkPricing.savings)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Final Price:</span>
                  <span>{formatCurrency(finalPrice)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Savings Progress */}
        {totalSavings > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Savings</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(totalSavings)}
              </span>
            </div>
            <Progress value={savingsPercentage} className="h-2" />
            <div className="text-xs text-center text-muted-foreground">
              {savingsPercentage.toFixed(1)}% off regular price
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};