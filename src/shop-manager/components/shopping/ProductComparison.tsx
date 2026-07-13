import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { X, Plus, ShoppingCart, Heart, ExternalLink, GitCompare } from 'lucide-react';
import { AffiliateProduct } from '@/types/affiliate';
import { formatCurrency } from '@/lib/utils';
import ImageWithFallback from './ImageWithFallback';
import { ProductRating } from '@/components/affiliate/ProductRating';
import { useToast } from '@/hooks/use-toast';

interface ProductComparisonProps {
  products: AffiliateProduct[];
  onRemoveProduct: (productId: string) => void;
  onAddToCart?: (product: AffiliateProduct) => void;
  onAddToWishlist?: (product: AffiliateProduct) => void;
  maxProducts?: number;
}

const ProductComparison: React.FC<ProductComparisonProps> = ({
  products,
  onRemoveProduct,
  onAddToCart,
  onAddToWishlist,
  maxProducts = 4
}) => {
  const { toast } = useToast();
  const [comparisonFeatures, setComparisonFeatures] = useState<string[]>([]);

  useEffect(() => {
    // Extract common features for comparison
    const features = new Set<string>();
    
    products.forEach(product => {
      // Add basic features
      features.add('Price');
      features.add('Rating');
      features.add('Manufacturer');
      features.add('Category');
      
      if (product.reviewCount) features.add('Reviews');
      if (product.discount) features.add('Discount');
      if (product.freeShipping) features.add('Free Shipping');
      if (product.isFeatured) features.add('Featured');
      if (product.bestSeller) features.add('Best Seller');
    });
    
    setComparisonFeatures(Array.from(features));
  }, [products]);

  const getFeatureValue = (product: AffiliateProduct, feature: string): React.ReactNode => {
    switch (feature) {
      case 'Price':
        return (
          <div className="space-y-1">
            <div className="font-bold text-lg">{formatCurrency(product.retailPrice)}</div>
            {product.discount && (
              <Badge variant="destructive" className="text-xs">
                {product.discount}% OFF
              </Badge>
            )}
          </div>
        );
      case 'Rating':
        return product.rating ? (
          <ProductRating rating={product.rating} reviewCount={product.reviewCount} />
        ) : (
          <span className="text-muted-foreground text-sm">No rating</span>
        );
      case 'Manufacturer':
        return <span className="font-medium">{product.manufacturer}</span>;
      case 'Category':
        return <Badge variant="secondary">{product.category}</Badge>;
      case 'Reviews':
        return product.reviewCount ? (
          <span className="text-sm">{product.reviewCount} reviews</span>
        ) : (
          <span className="text-muted-foreground text-sm">No reviews</span>
        );
      case 'Discount':
        return product.discount ? (
          <Badge variant="destructive">{product.discount}% OFF</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No discount</span>
        );
      case 'Free Shipping':
        return product.freeShipping ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        );
      case 'Featured':
        return product.isFeatured ? (
          <Badge variant="default">Featured</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        );
      case 'Best Seller':
        return product.bestSeller ? (
          <Badge className="bg-orange-500">Best Seller</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
        );
      default:
        return <span className="text-muted-foreground text-sm">-</span>;
    }
  };

  const handleShare = () => {
    const productNames = products.map(p => p.name).join(', ');
    const shareText = `Comparing products: ${productNames}`;
    
    if (navigator.share) {
      navigator.share({ title: 'Product Comparison', text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Comparison copied",
        description: "Product comparison details copied to clipboard.",
      });
    }
  };

  if (products.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <GitCompare className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">No products to compare</h3>
            <p className="text-muted-foreground">Add products to see a side-by-side comparison</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Product Comparison</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Badge variant="secondary">
            {products.length} of {maxProducts} products
          </Badge>
        </div>
      </div>

      {/* Products Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}>
        <div></div> {/* Empty cell for feature labels */}
        {products.map((product) => (
          <Card key={product.id} className="relative">
            <CardHeader className="pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => onRemoveProduct(product.id)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="aspect-square mb-2 relative rounded-md overflow-hidden">
                <ImageWithFallback
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-medium text-sm line-clamp-2" title={product.name}>
                  {product.name}
                </h3>
                <p className="text-xs text-muted-foreground">{product.manufacturer}</p>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex flex-col gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full"
                  onClick={() => onAddToCart?.(product)}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Add to Cart
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onAddToWishlist?.(product)}
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Wishlist
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardContent className="p-0">
          <div className="grid gap-0" style={{ gridTemplateColumns: `200px repeat(${products.length}, 1fr)` }}>
            {comparisonFeatures.map((feature, index) => (
              <React.Fragment key={feature}>
                {/* Feature Label */}
                <div 
                  className={`p-4 font-medium bg-muted/50 flex items-center ${
                    index < comparisonFeatures.length - 1 ? 'border-b' : ''
                  }`}
                >
                  {feature}
                </div>
                
                {/* Feature Values */}
                {products.map((product, productIndex) => (
                  <div 
                    key={`${product.id}-${feature}`}
                    className={`p-4 flex items-center ${
                      index < comparisonFeatures.length - 1 ? 'border-b' : ''
                    } ${productIndex < products.length - 1 ? 'border-r' : ''}`}
                  >
                    {getFeatureValue(product, feature)}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductComparison;