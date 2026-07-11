import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Share2, ShoppingCart, Eye, Package, Settings } from "lucide-react";
import { AffiliateProduct } from '@/types/affiliate';
import { ProductVariant, ProductBundle } from '@/types/advanced-product';
import ProductTierBadge from '@/components/affiliate/ProductTierBadge';
import { ProductRating } from '@/components/affiliate/ProductRating';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useProductAnalytics } from '@/hooks/shopping/useProductAnalytics';
import { useWishlist } from '@/hooks/shopping/useWishlist';
import { useCart } from '@/hooks/shopping/useCart';
import { ProductVariantSelector } from './ProductVariantSelector';
import { DynamicPricingDisplay } from './DynamicPricingDisplay';
import { BundleSelector } from './BundleSelector';
import ImageWithFallback from './ImageWithFallback';
import ProductViewTracker from './ProductViewTracker';

interface VariantAwareProductCardProps {
  product: AffiliateProduct;
  variants?: ProductVariant[];
  bundles?: ProductBundle[];
  showVariants?: boolean;
  showDynamicPricing?: boolean;
  showBundles?: boolean;
  compact?: boolean;
}

export const VariantAwareProductCard: React.FC<VariantAwareProductCardProps> = ({
  product,
  variants = [],
  bundles = [],
  showVariants = true,
  showDynamicPricing = true,
  showBundles = false,
  compact = false
}) => {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);
  const [effectivePrice, setEffectivePrice] = useState(product.retailPrice);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  
  const { toast } = useToast();
  const { trackInteraction } = useProductAnalytics();
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  useEffect(() => {
    checkWishlistStatus();
  }, [product.id]);

  useEffect(() => {
    if (selectedVariant) {
      setEffectivePrice(product.retailPrice + selectedVariant.price_adjustment);
    } else {
      setEffectivePrice(product.retailPrice);
    }
  }, [selectedVariant, product.retailPrice]);

  const checkWishlistStatus = async () => {
    try {
      const inWishlist = await isInWishlist(product.id);
      setIsWishlisted(inWishlist);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const handleClick = () => {
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: 'click',
      category: product.category
    });
    navigate(`/product/${product.id}`);
  };

  const handleWishlistToggle = async () => {
    try {
      if (isWishlisted) {
        await removeFromWishlist(product.id);
        setIsWishlisted(false);
        toast({
          title: "Removed from wishlist",
          description: `${product.name} has been removed from your wishlist.`,
        });
      } else {
        await addToWishlist({
          productId: product.id,
          name: product.name,
          price: effectivePrice,
          imageUrl: selectedVariant?.image_url || product.imageUrl,
          category: product.category,
          manufacturer: product.manufacturer
        });
        setIsWishlisted(true);
        toast({
          title: "Added to wishlist",
          description: `${product.name} has been added to your wishlist.`,
        });
      }

      trackInteraction({
        productId: product.id,
        productName: product.name,
        interactionType: 'save',
        category: product.category
      });
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddToCart = async () => {
    try {
      const finalPrice = selectedVariant ? 
        product.retailPrice + selectedVariant.price_adjustment : 
        product.retailPrice;
      
      const productName = product.name + (selectedVariant ? ` (${selectedVariant.variant_value})` : '');
      const imageUrl = selectedVariant?.image_url || product.imageUrl;
      
      await addToCart({
        productId: product.id,
        name: productName,
        price: finalPrice,
        imageUrl,
        category: product.category,
        manufacturer: product.manufacturer,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.variant_name
      });

      trackInteraction({
        productId: product.id,
        productName: product.name,
        interactionType: 'add_to_cart',
        category: product.category
      });

      toast({
        title: "Added to cart",
        description: `${productName} has been added to your cart.`,
      });

      // Reset variant selection for multiple additions
      if (variants.length > 1) {
        setSelectedVariant(null);
        setShowVariantSelector(false);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive"
      });
    }
  };

  const handleVariantSelection = () => {
    if (variants.length === 0) {
      handleAddToCart();
    } else if (variants.length === 1) {
      setSelectedVariant(variants[0]);
      handleAddToCart();
    } else {
      setShowVariantSelector(true);
    }
  };

  const handleBundleSelect = async (bundle: ProductBundle, selectedItems: any[]) => {
    try {
      // Add bundle to cart (would need bundle cart functionality)
      toast({
        title: "Bundle added",
        description: `${bundle.name} bundle has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add bundle to cart.",
        variant: "destructive"
      });
    }
  };

  if (compact) {
    return (
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <div className="flex">
          <div className="w-24 h-24 relative">
            <ImageWithFallback 
              src={selectedVariant?.image_url || product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 p-4 space-y-2">
            <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
            <p className="text-xs text-muted-foreground">{product.manufacturer}</p>
            
            {showDynamicPricing ? (
              <DynamicPricingDisplay
                productId={product.id}
                basePrice={effectivePrice}
                compact={true}
              />
            ) : (
              <div className="font-bold text-sm">
                {formatCurrency(effectivePrice)}
              </div>
            )}
            
            <div className="flex gap-1">
              <Button size="sm" onClick={handleVariantSelection} className="flex-1">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button variant="outline" size="sm" onClick={handleWishlistToggle}>
                <Heart className={`h-3 w-3 ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <ProductViewTracker product={product} />
      <Card className="overflow-hidden h-full flex flex-col transition-all hover:shadow-md group">
        <div 
          className="relative aspect-square cursor-pointer overflow-hidden"
          onClick={handleClick}
        >
          <ImageWithFallback 
            src={selectedVariant?.image_url || product.imageUrl} 
            alt={product.name} 
            className="h-full w-full object-cover transition-all group-hover:scale-105"
            showPlaceholder={true}
          />
          
          {/* Product Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isFeatured && <ProductTierBadge tier={product.tier} />}
            {product.bestSeller && (
              <Badge className="bg-orange-500 hover:bg-orange-600">
                Best Seller
              </Badge>
            )}
            {product.discount && (
              <Badge className="bg-red-500 hover:bg-red-600">
                {product.discount}% OFF
              </Badge>
            )}
            {variants.length > 0 && (
              <Badge variant="outline" className="bg-background/90">
                <Package className="h-3 w-3 mr-1" />
                {variants.length} options
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleWishlistToggle();
              }}
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            {variants.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVariantSelector(!showVariantSelector);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <CardContent className="flex-grow p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">{product.manufacturer}</p>
            <h3 
              className="font-medium text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={handleClick}
            >
              {product.name}
            </h3>
          </div>

          {/* Selected Variant Display */}
          {selectedVariant && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <Badge variant="outline" className="text-xs">
                {selectedVariant.variant_name}: {selectedVariant.variant_value}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVariant(null)}
                className="h-6 px-2 text-xs"
              >
                Change
              </Button>
            </div>
          )}

          {/* Pricing */}
          {showDynamicPricing ? (
            <DynamicPricingDisplay
              productId={product.id}
              basePrice={effectivePrice}
              quantity={1}
              compact={true}
            />
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">
                  {formatCurrency(effectivePrice)}
                </span>
                {product.discount && (
                  <Badge variant="destructive" className="text-xs">
                    {product.discount}% OFF
                  </Badge>
                )}
              </div>
              {selectedVariant && selectedVariant.price_adjustment !== 0 && (
                <div className="text-sm text-muted-foreground">
                  Base: {formatCurrency(product.retailPrice)} 
                  {selectedVariant.price_adjustment > 0 ? ' + ' : ' - '}
                  {formatCurrency(Math.abs(selectedVariant.price_adjustment))}
                </div>
              )}
              {product.discount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(effectivePrice * (1 + product.discount / 100))}
                </span>
              )}
            </div>
          )}
          
          {product.rating && (
            <ProductRating rating={product.rating} reviewCount={product.reviewCount} />
          )}

          {/* Variant Selector (when expanded) */}
          {showVariantSelector && variants.length > 0 && (
            <>
              <Separator />
              <ProductVariantSelector
                productId={product.id}
                basePrice={product.retailPrice}
                variants={variants}
                selectedVariant={selectedVariant}
                onVariantChange={setSelectedVariant}
                showPricing={false}
              />
            </>
          )}

          {/* Bundle Options */}
          {showBundles && bundles.length > 0 && (
            <>
              <Separator />
              <BundleSelector
                bundles={bundles}
                onBundleSelect={handleBundleSelect}
                maxBundles={2}
              />
            </>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button 
            variant="default" 
            className="flex-1"
            onClick={handleVariantSelection}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {variants.length > 1 && !selectedVariant ? 'Select Options' : 'Add to Cart'}
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleWishlistToggle}
            className={isWishlisted ? 'border-red-500 text-red-500' : ''}
          >
            <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};