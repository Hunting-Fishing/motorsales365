import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Plus, Minus, Star, ShoppingCart } from 'lucide-react';
import { ProductBundle, BundleItem, BundleCalculation } from '@/types/advanced-product';
import { formatCurrency } from '@/lib/utils';

interface BundleSelectorProps {
  bundles: ProductBundle[];
  onBundleSelect: (bundle: ProductBundle, selectedItems: BundleItem[]) => void;
  showPricing?: boolean;
  maxBundles?: number;
}

export const BundleSelector: React.FC<BundleSelectorProps> = ({
  bundles,
  onBundleSelect,
  showPricing = true,
  maxBundles = 3
}) => {
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, BundleItem>>(new Map());
  const [bundleCalculations, setBundleCalculations] = useState<Map<string, BundleCalculation>>(new Map());

  useEffect(() => {
    // Calculate bundle pricing for all bundles
    const calculations = new Map<string, BundleCalculation>();
    
    bundles.forEach(bundle => {
      if (bundle.items) {
        const calculation = calculateBundlePrice(bundle);
        calculations.set(bundle.id, calculation);
      }
    });
    
    setBundleCalculations(calculations);
  }, [bundles]);

  const calculateBundlePrice = (bundle: ProductBundle): BundleCalculation => {
    if (!bundle.items || bundle.items.length === 0) {
      return {
        individual_total: 0,
        bundle_price: bundle.base_price,
        total_savings: 0,
        savings_percentage: 0,
        items: []
      };
    }

    const items = bundle.items.map(item => {
      const individualPrice = item.product?.price || 0;
      const bundlePrice = item.custom_price || individualPrice;
      
      return {
        product_id: item.product_id,
        name: item.product?.name || item.product?.title || 'Unknown Product',
        individual_price: individualPrice * item.quantity,
        bundle_price: bundlePrice * item.quantity,
        quantity: item.quantity
      };
    });

    const individualTotal = items.reduce((sum, item) => sum + item.individual_price, 0);
    let bundlePrice = bundle.base_price;

    // Apply bundle discounts
    if (bundle.discount_percentage) {
      bundlePrice = individualTotal * (1 - bundle.discount_percentage / 100);
    } else if (bundle.discount_amount) {
      bundlePrice = individualTotal - bundle.discount_amount;
    }

    bundlePrice = Math.max(0, bundlePrice);
    const totalSavings = individualTotal - bundlePrice;
    const savingsPercentage = individualTotal > 0 ? (totalSavings / individualTotal) * 100 : 0;

    return {
      individual_total: individualTotal,
      bundle_price: bundlePrice,
      total_savings: totalSavings,
      savings_percentage: savingsPercentage,
      items
    };
  };

  const handleBundleSelection = (bundle: ProductBundle) => {
    setSelectedBundle(bundle);
    
    if (bundle.items) {
      const newSelectedItems = new Map<string, BundleItem>();
      
      // Auto-select required items
      bundle.items
        .filter(item => item.is_required)
        .forEach(item => {
          newSelectedItems.set(item.id, item);
        });
      
      setSelectedItems(newSelectedItems);
    }
  };

  const handleItemToggle = (item: BundleItem, checked: boolean) => {
    const newSelectedItems = new Map(selectedItems);
    
    if (checked) {
      newSelectedItems.set(item.id, item);
    } else {
      newSelectedItems.delete(item.id);
    }
    
    setSelectedItems(newSelectedItems);
  };

  const handleAddToCart = () => {
    if (selectedBundle && selectedItems.size > 0) {
      onBundleSelect(selectedBundle, Array.from(selectedItems.values()));
    }
  };

  const getSelectedBundleCalculation = (): BundleCalculation | null => {
    if (!selectedBundle) return null;
    
    const calculation = bundleCalculations.get(selectedBundle.id);
    if (!calculation) return null;

    // Filter items based on current selection
    const selectedItemsArray = Array.from(selectedItems.values());
    const filteredItems = calculation.items.filter(item => 
      selectedItemsArray.some(selected => selected.product_id === item.product_id)
    );

    const individualTotal = filteredItems.reduce((sum, item) => sum + item.individual_price, 0);
    let bundlePrice = selectedBundle.base_price;

    // Proportionally calculate bundle price based on selected items
    if (calculation.individual_total > 0) {
      const ratio = individualTotal / calculation.individual_total;
      bundlePrice = calculation.bundle_price * ratio;
    }

    const totalSavings = individualTotal - bundlePrice;
    const savingsPercentage = individualTotal > 0 ? (totalSavings / individualTotal) * 100 : 0;

    return {
      individual_total: individualTotal,
      bundle_price: bundlePrice,
      total_savings: totalSavings,
      savings_percentage: savingsPercentage,
      items: filteredItems
    };
  };

  const activeBundles = bundles
    .filter(bundle => bundle.is_active)
    .slice(0, maxBundles);

  if (activeBundles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Bundle Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Bundles
            <Badge variant="secondary">{activeBundles.length} available</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeBundles.map(bundle => {
              const calculation = bundleCalculations.get(bundle.id);
              const isSelected = selectedBundle?.id === bundle.id;
              
              return (
                <div
                  key={bundle.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-muted'
                  }`}
                  onClick={() => handleBundleSelection(bundle)}
                >
                  {bundle.image_url && (
                    <img
                      src={bundle.image_url}
                      alt={bundle.name}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{bundle.name}</h4>
                      {bundle.is_featured && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    {bundle.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {bundle.description}
                      </p>
                    )}
                    
                    {calculation && showPricing && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {formatCurrency(calculation.bundle_price)}
                          </span>
                          {calculation.total_savings > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Save {formatCurrency(calculation.total_savings)}
                            </Badge>
                          )}
                        </div>
                        
                        {calculation.total_savings > 0 && (
                          <div className="text-sm text-muted-foreground line-through">
                            Individual: {formatCurrency(calculation.individual_total)}
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          {bundle.items?.length || 0} items included
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Bundle Details */}
      {selectedBundle && selectedBundle.items && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Customize Bundle: {selectedBundle.name}</span>
              <Button
                onClick={handleAddToCart}
                disabled={selectedItems.size === 0}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Add Bundle to Cart
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {selectedBundle.items
                .sort((a, b) => a.display_order - b.display_order)
                .map(item => {
                  const isSelected = selectedItems.has(item.id);
                  const isRequired = item.is_required;
                  
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 p-4 border rounded-lg ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-muted'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isRequired}
                        onCheckedChange={(checked) => 
                          handleItemToggle(item, checked as boolean)
                        }
                      />
                      
                      {item.product?.image_url && (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name || item.product.title}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-medium">
                            {item.product?.name || item.product?.title || 'Unknown Product'}
                          </h5>
                          {isRequired && (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </div>
                        
                        {showPricing && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold">
                              {formatCurrency((item.custom_price || item.product?.price || 0) * item.quantity)}
                            </span>
                            {item.custom_price && item.product?.price && item.custom_price < item.product.price && (
                              <span className="text-muted-foreground line-through">
                                {formatCurrency(item.product.price * item.quantity)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {/* Bundle Price Summary */}
            {showPricing && (() => {
              const calculation = getSelectedBundleCalculation();
              if (!calculation) return null;
              
              return (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h5 className="font-medium">Bundle Summary</h5>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Individual Price Total:</span>
                        <span>{formatCurrency(calculation.individual_total)}</span>
                      </div>
                      {calculation.total_savings > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Bundle Savings:</span>
                          <span>-{formatCurrency(calculation.total_savings)}</span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Bundle Price:</span>
                        <span>{formatCurrency(calculation.bundle_price)}</span>
                      </div>
                      {calculation.total_savings > 0 && (
                        <div className="text-center text-sm text-green-600 font-medium">
                          You save {calculation.savings_percentage.toFixed(1)}%!
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};