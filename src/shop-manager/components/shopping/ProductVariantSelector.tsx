import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Package, Palette, Ruler, Settings } from 'lucide-react';
import { ProductVariant } from '@/types/advanced-product';
import { formatCurrency } from '@/lib/utils';

interface ProductVariantSelectorProps {
  productId: string;
  basePrice: number;
  variants: ProductVariant[];
  selectedVariant?: ProductVariant;
  onVariantChange: (variant: ProductVariant | null) => void;
  showPricing?: boolean;
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  productId,
  basePrice,
  variants,
  selectedVariant,
  onVariantChange,
  showPricing = true
}) => {
  const [groupedVariants, setGroupedVariants] = useState<Record<string, ProductVariant[]>>({});

  // Group variants by type
  useEffect(() => {
    const grouped = variants.reduce((acc, variant) => {
      const type = variant.variant_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(variant);
      return acc;
    }, {} as Record<string, ProductVariant[]>);

    // Sort variants within each group by sort_order
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.sort_order - b.sort_order);
    });

    setGroupedVariants(grouped);
  }, [variants]);

  const getVariantIcon = (variantType: string) => {
    switch (variantType) {
      case 'size':
        return <Ruler className="h-4 w-4" />;
      case 'color':
        return <Palette className="h-4 w-4" />;
      case 'material':
        return <Package className="h-4 w-4" />;
      case 'specification':
        return <Settings className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getVariantTypeLabel = (variantType: string) => {
    return variantType.charAt(0).toUpperCase() + variantType.slice(1);
  };

  const calculatePrice = (variant: ProductVariant) => {
    return basePrice + variant.price_adjustment;
  };

  const isVariantAvailable = (variant: ProductVariant) => {
    return variant.is_available && variant.stock_quantity > 0;
  };

  if (variants.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedVariants).map(([variantType, typeVariants]) => (
          <div key={variantType} className="space-y-3">
            <div className="flex items-center gap-2">
              {getVariantIcon(variantType)}
              <h4 className="font-medium">{getVariantTypeLabel(variantType)}</h4>
            </div>
            
            <RadioGroup
              value={selectedVariant?.id || ''}
              onValueChange={(value) => {
                const variant = variants.find(v => v.id === value);
                onVariantChange(variant || null);
              }}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              {typeVariants.map((variant) => {
                const isAvailable = isVariantAvailable(variant);
                const calculatedPrice = calculatePrice(variant);
                const isSelected = selectedVariant?.id === variant.id;

                return (
                  <div
                    key={variant.id}
                    className={`relative border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-muted'
                    } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RadioGroupItem
                      value={variant.id}
                      id={variant.id}
                      className="sr-only"
                      disabled={!isAvailable}
                    />
                    <Label 
                      htmlFor={variant.id} 
                      className="cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {variant.variant_value}
                        </span>
                        {!isAvailable && (
                          <Badge variant="secondary" className="text-xs">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                      
                      {variant.image_url && (
                        <img
                          src={variant.image_url}
                          alt={variant.variant_value}
                          className="w-full h-16 object-cover rounded-md"
                        />
                      )}
                      
                      {showPricing && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-semibold">
                              {formatCurrency(calculatedPrice)}
                            </span>
                          </div>
                          {variant.price_adjustment !== 0 && (
                            <div className="text-xs text-muted-foreground">
                              {variant.price_adjustment > 0 ? '+' : ''}
                              {formatCurrency(variant.price_adjustment)}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {variant.sku && (
                        <div className="text-xs text-muted-foreground">
                          SKU: {variant.sku}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        {variant.stock_quantity} in stock
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
            
            {variantType !== Object.keys(groupedVariants)[Object.keys(groupedVariants).length - 1] && (
              <Separator />
            )}
          </div>
        ))}
        
        {selectedVariant && showPricing && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium mb-2">Selected Configuration</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Base Price:</span>
                <span>{formatCurrency(basePrice)}</span>
              </div>
              {selectedVariant.price_adjustment !== 0 && (
                <div className="flex justify-between">
                  <span>Option Adjustment:</span>
                  <span className={selectedVariant.price_adjustment > 0 ? 'text-red-600' : 'text-green-600'}>
                    {selectedVariant.price_adjustment > 0 ? '+' : ''}
                    {formatCurrency(selectedVariant.price_adjustment)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total Price:</span>
                <span>{formatCurrency(calculatePrice(selectedVariant))}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};