import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container } from 'semantic-ui-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCart } from '@/hooks/shopping/useCart';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShoppingCart, 
  Star, 
  ArrowLeft, 
  ExternalLink,
  Package,
  Truck,
  Shield,
  Loader2,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductDetailData {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  affiliate_link: string;
  average_rating: number;
  review_count: number;
  category_id: string;
  is_featured: boolean;
  is_bestseller: boolean;
  stock_quantity: number;
  sku: string;
  created_at: string;
}

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, loading: cartLoading } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('is_approved', true)
          .eq('product_type', 'affiliate')
          .single();

        if (error) throw error;
        if (!data) throw new Error('Product not found');
        
        setProduct(data);
      } catch (err: any) {
        console.error('Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    try {
      await addToCart({
        productId: product.id,
        name: product.title,
        price: product.price,
        imageUrl: product.image_url || '',
        category: 'Tools',
        manufacturer: 'Professional Tools'
      });
      toast.success(`Added ${product.title} to cart`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleBuyNow = () => {
    if (product?.affiliate_link) {
      window.open(product.affiliate_link, '_blank');
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading product details...</span>
        </div>
      </Container>
    );
  }

  if (error || !product) {
    return (
      <Container>
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/shopping')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shopping
          </Button>
          <Alert variant="destructive">
            <AlertDescription>
              {error || 'Product not found'}
            </AlertDescription>
          </Alert>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/shopping')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shopping
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.title}
                  className="w-full h-full object-contain bg-white p-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {product.is_featured && (
                <Badge variant="secondary">Featured</Badge>
              )}
              {product.is_bestseller && (
                <Badge variant="default">Best Seller</Badge>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{product.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${
                        i < Math.floor(product.average_rating || 0) 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-muted-foreground'
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.review_count || 0} reviews)
                </span>
              </div>
            </div>

            <div className="text-3xl font-bold text-primary">
              ${product.price?.toFixed(2) || '0.00'}
            </div>

            <p className="text-muted-foreground">
              {product.description || 'No description available.'}
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label htmlFor="quantity" className="font-medium">Quantity:</label>
                <select 
                  id="quantity"
                  value={quantity} 
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="border rounded px-3 py-1"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleAddToCart}
                  disabled={cartLoading}
                  className="flex-1"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <Button 
                  onClick={handleBuyNow}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Buy Now
                </Button>
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4" />
                <span>Fast Shipping</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                <span>Warranty</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                <span>In Stock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <Tabs defaultValue="description" className="mt-8">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="description" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {product.description || 'No detailed description available.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="specifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>SKU:</strong> {product.sku || 'N/A'}
                  </div>
                  <div>
                    <strong>Stock:</strong> {product.stock_quantity || 0} units
                  </div>
                  <div>
                    <strong>Category:</strong> Professional Tools
                  </div>
                  <div>
                    <strong>Added:</strong> {new Date(product.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-2" />
                  <p>No reviews yet. Be the first to review this product!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  );
}