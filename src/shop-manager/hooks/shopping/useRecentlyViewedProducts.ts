import { useState, useEffect } from 'react';
import { getRecentlyViewedProducts } from '@/services/productAnalyticsService';
import { useToast } from '@/hooks/use-toast';

interface RecentlyViewedProduct {
  product_id: string;
  product_name: string;
  category?: string;
  viewed_at: string;
}

export const useRecentlyViewedProducts = (userId?: string, sessionId?: string, limit: number = 5) => {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRecentlyViewed = async () => {
    try {
      setIsLoading(true);
      const data = await getRecentlyViewedProducts(userId, sessionId, limit);
      setProducts(data as RecentlyViewedProduct[]);
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
      toast({
        title: "Error",
        description: "Failed to load recently viewed products",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId || sessionId) {
      fetchRecentlyViewed();
    }
  }, [userId, sessionId, limit]);

  return {
    products,
    isLoading,
    refetch: fetchRecentlyViewed
  };
};