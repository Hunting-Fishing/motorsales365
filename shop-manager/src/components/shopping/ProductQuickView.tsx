import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Share2, ShoppingCart, Star, ExternalLink, Package } from 'lucide-react';
import { AffiliateProduct } from '@/types/affiliate';
import { ProductRating } from '@/components/affiliate/ProductRating';
import ProductTierBadge from '@/components/affiliate/ProductTierBadge';
import ProductVariants from '@/components/shopping/product/ProductVariants';
import ProductBundles from '@/components/shopping/product/ProductBundles';
import InventoryAlerts from '@/components/shopping/product/InventoryAlerts';
import { useCart } from '@/hooks/shopping/useCart';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ProductVariant } from '@/types/advanced-product';

interface ProductQuickViewProps {
  product: AffiliateProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  isOpen,
  onClose
}) => {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [variantPrice, setVariantPrice] = useState(0);
  const [stockAvailable, setStockAvailable] = useState(true);
  const [stockCount, setStockCount] = useState(0);

  useEffect(() => {
    if (product) {
      setVariantPrice(product.retailPrice);
    }
  }, [product]);

  if (!product) return null;

  const handleAddToCart = async () => {
    if (!stockAvailable) {
      toast.error('This product is currently out of stock');
      return;
    }

    try {
      for (let i = 0; i < quantity; i++) {
        await addToCart({
          productId: selectedVariant?.id || product.id,
          name: selectedVariant ? `${product.name} (${selectedVariant.variant_value})` : product.name,
          price: variantPrice,
          imageUrl: product.imageUrl,
          category: product.category,
          manufacturer: product.manufacturer
        });
      }
      toast.success(`Added ${quantity} item(s) to cart`);
      onClose();
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleVariantSelect = (variant: ProductVariant | null, calculatedPrice: number) => {
    setSelectedVariant(variant);
    setVariantPrice(calculatedPrice);
  };

  const handleStockCheck = (available: boolean, stock: number) => {
    setStockAvailable(available);
    setStockCount(stock);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + '/product/' + product.id);
    toast.success('Product link copied to clipboard');
  };

  const handleWishlist = () => {
    toast.success('Added to wishlist');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick View</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="relative">
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-96 object-cover rounded-lg"
            />
            {product.discount && (
              <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                {product.discount}% OFF
              </Badge>
            )}
            {product.isFeatured && (
              <div className="absolute top-2 left-2">
                <ProductTierBadge tier={product.tier} />
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <div>
              <Badge variant="outline" className="mb-2">
                {product.category}
              </Badge>
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <p className="text-muted-foreground">{product.manufacturer}</p>
            </div>

            {product.rating && (
              <ProductRating 
                rating={product.rating} 
                reviewCount={product.reviewCount} 
              />
            )}

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {formatCurrency(variantPrice)}
              </span>
              {variantPrice !== product.retailPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.retailPrice)}
                </span>
              )}
              {product.discount && (
                <Badge variant="destructive" className="ml-2">
                  {product.discount}% OFF
                </Badge>
              )}
            </div>

            {/* Stock Status */}
            {selectedVariant && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stockAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm ${stockAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {stockAvailable 
                    ? `In Stock (${stockCount} available)` 
                    : 'Out of Stock'
                  }
                </span>
              </div>
            )}

            <Separator />

            {/* Advanced Product Features */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="variants">Options</TabsTrigger>
                <TabsTrigger value="bundles">Bundles</TabsTrigger>
                <TabsTrigger value="alerts">Stock</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={!stockAvailable}
                    >
                      -
                    </Button>
                    <span className="w-12 text-center border rounded px-2 py-1">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.min(stockCount || 99, quantity + 1))}
                      disabled={!stockAvailable}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleAddToCart}
                    disabled={!stockAvailable}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {stockAvailable ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleWishlist}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(product.affiliateUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on {product.source === 'amazon' ? 'Amazon' : 'Retailer Site'}
                </Button>

                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.description || 'No description available for this product.'}
                  </p>
                </div>

                {product.freeShipping && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Free Shipping
                  </Badge>
                )}
              </TabsContent>

              <TabsContent value="variants">
                <ProductVariants
                  productId={product.id}
                  basePrice={product.retailPrice}
                  onVariantSelect={handleVariantSelect}
                  onStockCheck={handleStockCheck}
                />
              </TabsContent>

              <TabsContent value="bundles">
                <ProductBundles
                  productId={product.id}
                  limit={3}
                />
              </TabsContent>

              <TabsContent value="alerts">
                <InventoryAlerts
                  productId={product.id}
                  variantId={selectedVariant?.id}
                  showActions={false}
                  compact={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductQuickView;