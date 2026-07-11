import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, Eye, ExternalLink } from 'lucide-react';
import { AffiliateProduct } from '@/types/affiliate';
import { useProductAnalytics } from '@/hooks/shopping/useProductAnalytics';
import { useWishlist } from '@/hooks/shopping/useWishlist';
import { useCart } from '@/hooks/shopping/useCart';
import { useToast } from '@/hooks/use-toast';
import ProductViewTracker from './ProductViewTracker';

interface ProductCardProps {
  product: AffiliateProduct;
  onQuickView?: (product: AffiliateProduct) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { trackInteraction } = useProductAnalytics();
  const { addToWishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleClick = async () => {
    await trackInteraction({
      productId: product.id,
      productName: product.name,
      category: product.category,
      interactionType: 'click',
      metadata: {
        price: product.retailPrice,
        manufacturer: product.manufacturer,
        clickedAt: new Date().toISOString()
      }
    });
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    
    try {
      if (isInWishlist) {
        await removeFromWishlist(product.id);
        setIsInWishlist(false);
        toast({
          title: "Removed from wishlist",
          description: `${product.name} has been removed from your wishlist.`
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
        setIsInWishlist(true);
        toast({
          title: "Added to wishlist",
          description: `${product.name} has been added to your wishlist.`
        });
      }

      await trackInteraction({
        productId: product.id,
        productName: product.name,
        category: product.category,
        interactionType: 'save',
        metadata: {
          action: isInWishlist ? 'remove' : 'add',
          price: product.retailPrice
        }
      });
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to update wishlist. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);

    try {
      await addToCart({
        productId: product.id,
        name: product.name,
        price: product.retailPrice,
        imageUrl: product.imageUrl,
        category: product.category,
        manufacturer: product.manufacturer
      });

      await trackInteraction({
        productId: product.id,
        productName: product.name,
        category: product.category,
        interactionType: 'add_to_cart',
        metadata: {
          price: product.retailPrice,
          quantity: 1,
          addedAt: new Date().toISOString()
        }
      });

      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
      trackInteraction({
        productId: product.id,
        productName: product.name,
        category: product.category,
        interactionType: 'view',
        metadata: {
          viewType: 'quick_view',
          price: product.retailPrice
        }
      });
    }
  };

  const handleAffiliateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
    window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  const isOnSale = product.discount && product.discount > 0;
  const discountPercentage = product.discount || 0;

  return (
    <div onClick={handleClick}>
      <ProductViewTracker product={product} />
      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 hover:border-border bg-card">
        <div className="relative overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-contain bg-white p-2 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isFeatured && (
              <Badge variant="default" className="text-xs bg-primary/90">
                Featured
              </Badge>
            )}
            {product.bestSeller && (
              <Badge variant="secondary" className="text-xs bg-accent/90">
                Best Seller
              </Badge>
            )}
            {isOnSale && (
              <Badge variant="destructive" className="text-xs">
                {discountPercentage}% OFF
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background"
            onClick={handleWishlistToggle}
            disabled={isLoading}
          >
            <Heart 
              className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
            />
          </Button>

          {/* Quick View Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background text-xs px-2 h-7"
            onClick={handleQuickView}
          >
            <Eye className="h-3 w-3 mr-1" />
            Quick View
          </Button>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Category */}
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {product.category}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Manufacturer */}
          <div className="text-xs text-muted-foreground">
            by {product.manufacturer}
          </div>

          {/* Rating */}
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= product.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                ({product.reviewCount})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">
              ${product.retailPrice.toFixed(2)}
            </span>
            {isOnSale && (
              <span className="text-sm text-muted-foreground line-through">
                ${(product.retailPrice * (1 + discountPercentage / 100)).toFixed(2)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAddToCart}
              disabled={isLoading}
              size="sm"
              className="flex-1 h-8 text-xs"
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              Add to Cart
            </Button>
            <Button
              variant="outline"
              onClick={handleAffiliateClick}
              size="sm"
              className="h-8 px-3"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductCard;