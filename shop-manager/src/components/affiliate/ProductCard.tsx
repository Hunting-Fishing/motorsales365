
import React from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Share2, ShoppingCart } from "lucide-react";
import { AffiliateProduct } from '@/types/affiliate';
import ProductTierBadge from './ProductTierBadge';
import { ProductRating } from './ProductRating';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  ProductViewTracker, 
  useProductAnalytics,
  ProductInteractionType 
} from '@/components/developer/shopping/analytics/AnalyticsTracker';

interface ProductCardProps {
  product: AffiliateProduct;
  onProductClick?: () => void;
  onSaveClick?: () => void;
  onShareClick?: () => void;
  onAddToCartClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onProductClick,
  onSaveClick,
  onShareClick,
  onAddToCartClick
}) => {
  const { toast } = useToast();
  const { trackInteraction } = useProductAnalytics();
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (onProductClick) {
      onProductClick();
    } else {
      trackInteraction({
        productId: product.id,
        productName: product.name,
        interactionType: ProductInteractionType.CLICK,
        category: product.category
      });
      // Navigate to product detail page instead of opening affiliate link
      navigate(`/product/${product.id}`);
    }
  };
  
  const handleSaveClick = () => {
    if (onSaveClick) {
      onSaveClick();
    } else {
      trackInteraction({
        productId: product.id,
        productName: product.name,
        interactionType: ProductInteractionType.SAVE,
        category: product.category
      });
    }
    
    toast({
      title: "Product saved",
      description: `${product.name} has been added to your saved items.`,
    });
  };
  
  const handleShareClick = () => {
    if (onShareClick) {
      onShareClick();
    } else {
      trackInteraction({
        productId: product.id,
        productName: product.name,
        interactionType: ProductInteractionType.SHARE,
        category: product.category
      });
    }
    
    // Copy the product URL to clipboard
    navigator.clipboard.writeText(window.location.origin + '/product/' + product.id);
    
    toast({
      title: "Link copied",
      description: "Product link copied to clipboard.",
    });
  };
  
  const handleAddToCartClick = () => {
    if (onAddToCartClick) {
      onAddToCartClick();
    } else {
      trackInteraction({
        productId: product.id,
        productName: product.name,
        interactionType: ProductInteractionType.ADD_TO_CART,
        category: product.category
      });
    }
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <>
      <ProductViewTracker product={product} />
      <Card className="overflow-hidden h-full flex flex-col transition-all hover:shadow-md">
        <div 
          className="relative aspect-square cursor-pointer overflow-hidden"
          onClick={handleClick}
        >
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="h-full w-full object-contain bg-white p-2 transition-all hover:scale-105"
          />
          {product.discount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              {product.discount}% OFF
            </div>
          )}
          {product.isFeatured && (
            <div className="absolute top-2 left-2">
              <ProductTierBadge tier={product.tier} />
            </div>
          )}
        </div>
        <CardContent className="flex-grow p-4">
          <div className="mb-2">
            <p className="text-sm text-slate-500">{product.manufacturer}</p>
            <h3 
              className="font-medium text-lg line-clamp-2 cursor-pointer hover:text-blue-600"
              onClick={handleClick}
            >
              {product.name}
            </h3>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-bold text-lg">
                {formatCurrency(product.retailPrice)}
              </span>
              {product.discount && (
                <span className="text-sm text-slate-500 line-through ml-2">
                  {formatCurrency(product.retailPrice * (1 + product.discount / 100))}
                </span>
              )}
            </div>
          </div>
          {product.rating && (
            <ProductRating rating={product.rating} reviewCount={product.reviewCount} />
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button 
            variant="default" 
            className="flex-1"
            onClick={handleClick}
          >
            View Details
          </Button>
          {onAddToCartClick && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleAddToCartClick}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleSaveClick}
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleShareClick}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

export default ProductCard;
