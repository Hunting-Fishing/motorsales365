
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ShoppingAnalytics {
  totalProducts: number;
  totalViews: number;
  totalClicks: number;
  conversionRate: number;
  topProducts: Array<{
    id: string;
    name: string;
    views: number;
    clicks: number;
  }>;
}

export function useShoppingAnalytics() {
  const [analytics, setAnalytics] = useState<ShoppingAnalytics>({
    totalProducts: 0,
    totalViews: 0,
    totalClicks: 0,
    conversionRate: 0,
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real product count from database
      const { count: productCount, error: productError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productError) throw productError;

      // Fetch real analytics data from product_analytics table if it exists
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('product_analytics')
        .select('*');

      // Calculate real metrics from actual data
      const totalViews = analyticsData?.filter(a => a.interaction_type === 'view').length || 0;
      const totalClicks = analyticsData?.filter(a => a.interaction_type === 'click').length || 0;
      
      setAnalytics({
        totalProducts: productCount || 0,
        totalViews,
        totalClicks,
        conversionRate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
        topProducts: [] // Will be populated from real analytics data
      });

    } catch (err: any) {
      console.error('Error fetching shopping analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
}
