// Product Bundles Component
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Package, Star, ArrowRight } from 'lucide-react';
import { ProductBundle, BundleCalculation } from '@/types/advanced-product';
import { bundleService } from '@/services/advanced-product/bundleService';
import { useCart } from '@/hooks/shopping/useCart';
import { toast } from 'sonner';

interface ProductBundlesProps {
  productId?: string;
  featured?: boolean;
  limit?: number;
  onBundleSelect?: (bundle: ProductBundle) => void;
}

export default function ProductBundles({ 
  productId, 
  featured = false, 
  limit = 6,
  onBundleSelect 
}: ProductBundlesProps) {
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundleCalculations, setBundleCalculations] = useState<Record<string, BundleCalculation>>({});
  const { addToCart } = useCart();

  useEffect(() => {
    loadBundles();
  }, [productId, featured, limit]);

  const loadBundles = async () => {
    try {
      setLoading(true);
      let bundleData: ProductBundle[];

      if (productId) {
        bundleData = await bundleService.getBundlesWithProduct(productId);
      } else if (featured) {
        bundleData = await bundleService.getFeaturedBundles(limit);
      } else {
        bundleData = await bundleService.getBundles({ limit });
      }

      setBundles(bundleData);

      // Calculate pricing for each bundle
      const calculations: Record<string, BundleCalculation> = {};
      for (const bundle of bundleData) {
        try {
          const calc = await bundleService.calculateBundlePrice(bundle.id);
          calculations[bundle.id] = calc;
        } catch (error) {
          console.error(`Error calculating bundle price for ${bundle.id}:`, error);
        }
      }
      setBundleCalculations(calculations);
    } catch (error) {
      console.error('Error loading bundles:', error);
      toast.error('Failed to load product bundles');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBundleToCart = async (bundle: ProductBundle) => {
    try {
      const calculation = bundleCalculations[bundle.id];
      if (!calculation) {
        toast.error('Unable to calculate bundle price');
        return;
      }

      // Add bundle as a single cart item
      await addToCart({
        productId: bundle.id,
        name: bundle.name,
        price: calculation.bundle_price,
        imageUrl: bundle.image_url || '/placeholder.svg',
        category: 'Bundle',
        manufacturer: 'Bundle'
      });

      toast.success(`Added ${bundle.name} bundle to cart`);
    } catch (error) {
      console.error('Error adding bundle to cart:', error);
      toast.error('Failed to add bundle to cart');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded mb-4"></div>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (bundles.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No product bundles available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {featured ? 'Featured Bundles' : productId ? 'Related Bundles' : 'Product Bundles'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Save money with our curated product combinations
          </p>
        </div>
        {featured && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Featured
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bundles.map((bundle) => {
          const calculation = bundleCalculations[bundle.id];
          
          return (
            <Card key={bundle.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{bundle.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {bundle.description}
                    </CardDescription>
                  </div>
                  {bundle.is_featured && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Bundle Image */}
                {bundle.image_url && (
                  <div className="aspect-video w-full overflow-hidden rounded-md">
                    <img
                      src={bundle.image_url}
                      alt={bundle.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Bundle Items */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Includes:</h4>
                  <div className="space-y-1">
                    {bundle.items?.slice(0, 3).map((item, index) => (
                      <div key={item.id} className="flex items-center text-xs text-muted-foreground">
                        <span className="w-4 h-4 bg-primary/10 rounded-full flex items-center justify-center text-primary mr-2">
                          {item.quantity}
                        </span>
                        <span className="truncate">
                          {item.product?.name || item.product?.title}
                        </span>
                      </div>
                    ))}
                    {bundle.items && bundle.items.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{bundle.items.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Pricing */}
                {calculation && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Individual prices:</span>
                      <span className="line-through">{formatPrice(calculation.individual_total)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Bundle price:</span>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(calculation.bundle_price)}
                      </span>
                    </div>
                    {calculation.total_savings > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">You save:</span>
                        <span className="text-green-600 font-medium">
                          {formatPrice(calculation.total_savings)} ({calculation.savings_percentage.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddBundleToCart(bundle)}
                    className="flex-1"
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add Bundle
                  </Button>
                  {onBundleSelect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBundleSelect(bundle)}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Bundle Tags */}
                {bundle.tags && bundle.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {bundle.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}