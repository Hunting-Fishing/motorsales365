import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, X, Clock } from 'lucide-react';
import { getRecentlyViewedProducts, clearRecentlyViewedProducts, RecentlyViewedProduct } from '@/services/recentlyViewedService';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface RecentlyViewedProps {
  limit?: number;
  showHeader?: boolean;
  className?: string;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ 
  limit = 10, 
  showHeader = true,
  className = ""
}) => {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRecentlyViewed();
    } else {
      setLoading(false);
    }
  }, [user, limit]);

  const fetchRecentlyViewed = async () => {
    try {
      const data = await getRecentlyViewedProducts(limit);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearRecentlyViewedProducts();
      setProducts([]);
      toast({
        title: "History cleared",
        description: "Your recently viewed products have been cleared."
      });
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
      toast({
        title: "Error",
        description: "Failed to clear your viewing history.",
        variant: "destructive"
      });
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (!user || loading) {
    if (showHeader) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Viewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!user ? (
              <p className="text-muted-foreground text-center py-8">
                Sign in to see your recently viewed products
              </p>
            ) : (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <div className="h-16 w-16 bg-muted rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  if (products.length === 0) {
    if (showHeader) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Viewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No recently viewed products yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start browsing to see your viewing history here
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
      {products.map(product => (
        <div
          key={product.id}
          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => handleProductClick(product.product_id)}
        >
          <div className="h-16 w-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            {product.product_image_url ? (
              <img
                src={product.product_image_url}
                alt={product.product_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Eye className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2 mb-1">
              {product.product_name}
            </h4>
            {product.category && (
              <p className="text-xs text-muted-foreground mb-1">
                {product.category}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(product.viewed_at!), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  if (!showHeader) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recently Viewed
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default RecentlyViewed;