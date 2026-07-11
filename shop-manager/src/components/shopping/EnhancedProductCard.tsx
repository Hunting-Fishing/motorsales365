import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Share2, ShoppingCart, Eye, GitCompare, AlertTriangle } from "lucide-react";
import { AffiliateProduct } from '@/types/affiliate';
import ProductTierBadge from '@/components/affiliate/ProductTierBadge';
import { ProductRating } from '@/components/affiliate/ProductRating';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useProductAnalytics } from '@/hooks/shopping/useProductAnalytics';
import { useWishlist } from '@/hooks/shopping/useWishlist';
import { useProductComparison } from '@/hooks/shopping/useProductComparison';
import InventoryIntegration, { StockInfo } from './InventoryIntegration';
import ImageWithFallback from './ImageWithFallback';
import ProductViewTracker from './ProductViewTracker';

interface EnhancedProductCardProps {
  product: AffiliateProduct;
  onAddToCartClick?: () => void;
  showQuickActions?: boolean;
  showInventoryStatus?: boolean;
}

const EnhancedProductCard: React.FC<EnhancedProductCardProps> = ({ 
  product, 
  onAddToCartClick,
  showQuickActions = true,
  showInventoryStatus = true
}) => {
  const [stockInfo, setStockInfo] = useState<StockInfo>({
    inStock: true,
    quantity: 0,
    lowStock: false
  });
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  const { toast } = useToast();
  const { trackInteraction } = useProductAnalytics();
  const navigate = useNavigate();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { addToComparison, isInComparison, canAddMore } = useProductComparison();

  useEffect(() => {
    checkWishlistStatus();
  }, [product.id]);

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
          price: product.retailPrice,
          imageUrl: product.imageUrl,
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
  
  const handleShareClick = () => {
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: 'share',
      category: product.category
    });
    
    navigator.clipboard.writeText(window.location.origin + '/product/' + product.id);
    
    toast({
      title: "Link copied",
      description: "Product link copied to clipboard.",
    });
  };
  
  const handleAddToCartClick = () => {
    if (!stockInfo.inStock) {
      toast({
        title: "Out of stock",
        description: "This item is currently out of stock.",
        variant: "destructive"
      });
      return;
    }

    if (onAddToCartClick) {
      onAddToCartClick();
    }
    
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: 'add_to_cart',
      category: product.category
    });
  };

  const handleCompare = () => {
    if (isInComparison(product.id)) {
      toast({
        title: "Already in comparison",
        description: "This product is already being compared.",
      });
      return;
    }

    if (!canAddMore) {
      toast({
        title: "Comparison full",
        description: "You can only compare up to 4 products at once.",
        variant: "destructive"
      });
      return;
    }

    addToComparison(product);
    
    trackInteraction({
      productId: product.id,
      productName: product.name,
      interactionType: 'compare',
      category: product.category
    });
  };

  return (
    <>
      <ProductViewTracker product={product} />
      <Card className="overflow-hidden h-full flex flex-col transition-all hover:shadow-md group">
        <div 
          className="relative aspect-square cursor-pointer overflow-hidden"
          onClick={handleClick}
        >
        <ImageWithFallback 
          src={product.imageUrl} 
          alt={product.name} 
          className="h-full w-full object-contain bg-white p-2 transition-all group-hover:scale-105"
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
        </div>

        {/* Quick Actions (shown on hover) */}
        {showQuickActions && (
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
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleShareClick();
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCompare();
              }}
            >
              <GitCompare className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Stock Status Overlay */}
        {!stockInfo.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-lg px-4 py-2">
              Out of Stock
            </Badge>
          </div>
        )}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg">
              {formatCurrency(product.retailPrice)}
            </span>
            {product.discount && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.retailPrice * (1 + product.discount / 100))}
              </span>
            )}
          </div>
          
          {product.rating && (
            <ProductRating rating={product.rating} reviewCount={product.reviewCount} />
          )}
        </div>

        {/* Inventory Status */}
        {showInventoryStatus && (
          <InventoryIntegration 
            productId={product.id} 
            onStockUpdate={setStockInfo}
          />
        )}

        {stockInfo.lowStock && stockInfo.inStock && (
          <div className="flex items-center gap-1 text-orange-600 text-sm">
            <AlertTriangle className="h-3 w-3" />
            <span>Only {stockInfo.quantity} left!</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={handleAddToCartClick}
          disabled={!stockInfo.inStock}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {stockInfo.inStock ? 'Add to Cart' : 'Out of Stock'}
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

export default EnhancedProductCard;