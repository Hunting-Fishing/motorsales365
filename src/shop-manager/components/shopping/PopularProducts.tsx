import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProductsManager } from '@/hooks/affiliate/useProductsManager';
import { formatCurrency } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface PopularProduct {
  product_id: string;
  product_name: string;
  total_interactions: number;
  score: number;
}

interface PopularProductsProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

const PopularProducts: React.FC<PopularProductsProps> = ({ 
  limit = 5, 
  showHeader = true,
  className = ""
}) => {
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { products } = useProductsManager();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPopularProducts();
  }, [limit]);

  const fetchPopularProducts = async () => {
    try {
      const { data, error } = await supabase.rpc('get_popular_products', {
        days_back: 7,
        result_limit: limit
      });
      
      if (error) throw error;
      // Transform data to match PopularProduct interface
      const transformedData = Array.isArray(data) ? data.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        interaction_count: item.interaction_count,
        view_count: item.view_count,
        cart_add_count: item.cart_add_count,
        purchase_count: item.purchase_count,
        total_interactions: item.interaction_count, // Use interaction_count as total
        score: item.interaction_count // Use interaction_count as score
      })) : [];
      setPopularProducts(transformedData);
    } catch (error) {
      console.error('Error fetching popular products:', error);
      setPopularProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (loading) {
    if (showHeader) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading popular products...</span>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (popularProducts.length === 0) {
    if (showHeader) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Popular Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No trending products yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start browsing to see what's popular
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const content = (
    <div className="space-y-3">
      {popularProducts.map((popularProduct, index) => {
        const productDetails = getProductDetails(popularProduct.product_id);
        
        return (
          <div
            key={popularProduct.product_id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => handleProductClick(popularProduct.product_id)}
          >
            <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
              {index + 1}
            </div>
            
            <div className="h-12 w-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {productDetails?.imageUrl ? (
                <img
                  src={productDetails.imageUrl}
                  alt={popularProduct.product_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 mb-1">
                {popularProduct.product_name}
              </h4>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {productDetails?.category || 'Tools'}
                </p>
                {productDetails?.price && (
                  <p className="text-xs font-medium">
                    {formatCurrency(productDetails.price)}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {popularProduct.total_interactions} interactions (score: {Math.round(popularProduct.score)})
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (!showHeader) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Popular Products
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default PopularProducts;