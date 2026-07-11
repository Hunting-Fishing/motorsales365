// Product Variants Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Package, AlertTriangle } from 'lucide-react';
import { ProductVariant } from '@/types/advanced-product';
import { variantService } from '@/services/advanced-product/variantService';
import { toast } from 'sonner';

interface ProductVariantsProps {
  productId: string;
  basePrice: number;
  onVariantSelect?: (variant: ProductVariant | null, calculatedPrice: number) => void;
  onStockCheck?: (available: boolean, stock: number) => void;
  selectedVariantId?: string;
}

export default function ProductVariants({
  productId,
  basePrice,
  onVariantSelect,
  onStockCheck,
  selectedVariantId
}: ProductVariantsProps) {
  const [variantTypes, setVariantTypes] = useState<Array<{
    type: string;
    variants: ProductVariant[];
  }>>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockInfo, setStockInfo] = useState<{
    available: boolean;
    currentStock: number;
    canFulfill: boolean;
  } | null>(null);

  useEffect(() => {
    loadVariants();
  }, [productId]);

  useEffect(() => {
    if (selectedVariantId) {
      loadSelectedVariant(selectedVariantId);
    }
  }, [selectedVariantId]);

  useEffect(() => {
    updateCurrentVariant();
  }, [selectedVariants, variantTypes]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const types = await variantService.getVariantTypes(productId);
      setVariantTypes(types);
    } catch (error) {
      console.error('Error loading product variants:', error);
      toast.error('Failed to load product variants');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedVariant = async (variantId: string) => {
    try {
      const variant = await variantService.getVariant(variantId);
      if (variant) {
        setCurrentVariant(variant);
        setSelectedVariants({ [variant.variant_type]: variant.variant_value });
        checkStock(variant.id);
      }
    } catch (error) {
      console.error('Error loading selected variant:', error);
    }
  };

  const updateCurrentVariant = () => {
    // Find variant that matches all selected options
    let matchingVariant: ProductVariant | null = null;

    for (const type of variantTypes) {
      const selectedValue = selectedVariants[type.type];
      if (selectedValue) {
        const variant = type.variants.find(v => v.variant_value === selectedValue);
        if (variant) {
          matchingVariant = variant;
          break;
        }
      }
    }

    setCurrentVariant(matchingVariant);

    if (matchingVariant) {
      checkStock(matchingVariant.id);
      const calculatedPrice = basePrice + matchingVariant.price_adjustment;
      onVariantSelect?.(matchingVariant, calculatedPrice);
    } else {
      setStockInfo(null);
      onVariantSelect?.(null, basePrice);
    }
  };

  const checkStock = async (variantId: string) => {
    try {
      const stock = await variantService.checkVariantStock(variantId, 1);
      setStockInfo(stock);
      onStockCheck?.(stock.available, stock.currentStock);
    } catch (error) {
      console.error('Error checking variant stock:', error);
      setStockInfo(null);
    }
  };

  const handleVariantChange = (type: string, value: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const getVariantPrice = (variant: ProductVariant) => {
    return basePrice + variant.price_adjustment;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getPriceDisplay = (variant: ProductVariant) => {
    const price = getVariantPrice(variant);
    if (variant.price_adjustment === 0) {
      return formatPrice(price);
    } else if (variant.price_adjustment > 0) {
      return `${formatPrice(price)} (+${formatPrice(variant.price_adjustment)})`;
    } else {
      return `${formatPrice(price)} (${formatPrice(variant.price_adjustment)})`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4 animate-pulse"></div>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-10 w-20 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variantTypes.length === 0) {
    return null; // No variants available
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Options
        </CardTitle>
        <CardDescription>
          Choose from available variants below
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Variant Selection */}
        {variantTypes.map(({ type, variants }) => (
          <div key={type} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium capitalize">{type}:</Label>
              <span className="text-xs text-muted-foreground">
                {variants.length} options
              </span>
            </div>

            <RadioGroup
              value={selectedVariants[type] || ''}
              onValueChange={(value) => handleVariantChange(type, value)}
              className="flex flex-wrap gap-2"
            >
              {variants.map((variant) => (
                <div key={variant.id} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={variant.variant_value}
                    id={variant.id}
                    disabled={!variant.is_available || variant.stock_quantity === 0}
                  />
                  <Label
                    htmlFor={variant.id}
                    className={`cursor-pointer border rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedVariants[type] === variant.variant_value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    } ${
                      !variant.is_available || variant.stock_quantity === 0
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{variant.variant_value}</span>
                      {variant.price_adjustment !== 0 && (
                        <span className={`text-xs ${
                          variant.price_adjustment > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {variant.price_adjustment > 0 ? '+' : ''}{formatPrice(variant.price_adjustment)}
                        </span>
                      )}
                    </div>
                    
                    {/* Stock indicator */}
                    <div className="flex items-center gap-1 mt-1">
                      {variant.stock_quantity > 10 ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : variant.stock_quantity > 0 ? (
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {variant.stock_quantity > 10 
                          ? 'In stock' 
                          : variant.stock_quantity > 0 
                            ? `${variant.stock_quantity} left`
                            : 'Out of stock'
                        }
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        {/* Current Selection Summary */}
        {currentVariant && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selected Configuration:</h4>
                <div className="text-lg font-bold text-primary">
                  {formatPrice(getVariantPrice(currentVariant))}
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(selectedVariants).map(([type, value]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{type}:</span>
                    <Badge variant="outline">{value}</Badge>
                  </div>
                ))}
              </div>

              {/* Stock Status */}
              {stockInfo && (
                <Alert className={
                  stockInfo.canFulfill 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }>
                  <div className="flex items-center gap-2">
                    {stockInfo.canFulfill ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription>
                      {stockInfo.canFulfill
                        ? `✅ Available (${stockInfo.currentStock} in stock)`
                        : stockInfo.currentStock === 0
                          ? '❌ Out of stock'
                          : `⚠️ Low stock (${stockInfo.currentStock} remaining)`
                      }
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Variant Details */}
              {currentVariant.sku && (
                <div className="text-xs text-muted-foreground">
                  SKU: {currentVariant.sku}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}