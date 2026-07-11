import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ExternalLink } from 'lucide-react';
import { useRecentlyViewedProducts } from '@/hooks/shopping/useRecentlyViewedProducts';
import { Badge } from '@/components/ui/badge';

interface RecentlyViewedProductsProps {
  userId?: string;
  sessionId?: string;
  limit?: number;
}

const RecentlyViewedProducts: React.FC<RecentlyViewedProductsProps> = ({
  userId,
  sessionId = 'guest-session',
  limit = 5
}) => {
  const { products, isLoading, refetch } = useRecentlyViewedProducts(userId, sessionId, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recently Viewed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-12 h-12 bg-muted rounded"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recently Viewed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recently viewed products</p>
            <p className="text-xs">Products you view will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recently Viewed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {products.map((product) => (
            <div 
              key={`${product.product_id}-${product.viewed_at}`}
              className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {product.product_name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {product.product_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.category && (
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(product.viewed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0">
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        
        {products.length >= limit && (
          <div className="pt-3 border-t mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={refetch}
            >
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentlyViewedProducts;