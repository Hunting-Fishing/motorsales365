import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Heart, ExternalLink } from 'lucide-react';
import { AffiliateProduct } from '@/types/affiliate';
import { useCart } from '@/hooks/shopping/useCart';
import { useToast } from '@/hooks/use-toast';

interface QuickViewModalProps {
  product: AffiliateProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  if (!product) return null;

  const handleAddToCart = async () => {
    try {
      await addToCart({
        productId: product.id,
        name: product.name,
        price: product.retailPrice,
        imageUrl: product.imageUrl,
        category: product.category,
        manufacturer: product.manufacturer
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
    }
  };

  const handleAffiliateClick = () => {
    window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  const isOnSale = product.discount && product.discount > 0;
  const discountPercentage = product.discount || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Quick View</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="relative">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-80 object-cover rounded-lg"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isFeatured && (
                <Badge variant="default" className="text-xs">
                  Featured
                </Badge>
              )}
              {product.bestSeller && (
                <Badge variant="secondary" className="text-xs">
                  Best Seller
                </Badge>
              )}
              {isOnSale && (
                <Badge variant="destructive" className="text-xs">
                  {discountPercentage}% OFF
                </Badge>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {/* Category */}
            <div className="text-sm text-muted-foreground uppercase tracking-wide">
              {product.category}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold leading-tight">
              {product.name}
            </h2>

            {/* Manufacturer */}
            <div className="text-muted-foreground">
              by {product.manufacturer}
            </div>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= product.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.reviewCount} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-primary">
                ${product.retailPrice.toFixed(2)}
              </span>
              {isOnSale && (
                <span className="text-lg text-muted-foreground line-through">
                  ${(product.retailPrice * (1 + discountPercentage / 100)).toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <h3 className="font-semibold">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1"
                size="lg"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAffiliateClick}
                size="lg"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="px-3"
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-xs text-muted-foreground pt-2">
              Product ID: {product.id}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickViewModal;