
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase'; 
import { 
  TopProductAnalytics, 
  ProductAnalyticsData,
  CategoryAnalytics
} from '@/types/analytics';

export const useProductAnalyticsData = () => {
  // Fetch analytics data
  const { 
    data: analyticsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['productAnalytics'],
    queryFn: async (): Promise<ProductAnalyticsData> => {
      try {
        // Get total views
        const viewsResponse = await supabase
          .from('product_analytics')
          .select('*')
          .eq('interaction_type', 'view');
        const totalViews = viewsResponse.data?.length || 0;

        // Get total clicks
        const clicksResponse = await supabase
          .from('product_analytics')
          .select('*')
          .eq('interaction_type', 'click');
        const totalClicks = clicksResponse.data?.length || 0;

        // Get total saves
        const savesResponse = await supabase
          .from('product_analytics')
          .select('*')
          .eq('interaction_type', 'save');
        const totalSaved = savesResponse.data?.length || 0;

        // Calculate conversion rate
        const conversionRate = totalViews > 0
          ? (totalClicks / totalViews) * 100
          : 0;

        // Get category data
        const categoryResponse = await supabase
          .from('product_analytics')
          .select('category')
          .eq('interaction_type', 'view')
          .not('category', 'is', null);
        
        // Count entries by category
        const categoryMap = new Map<string, number>();
        if (categoryResponse.data) {
          categoryResponse.data.forEach(item => {
            const category = item.category || 'Unknown';
            categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
          });
        }
        
        const categoryData = Array.from(categoryMap.entries()).map(([name, count]) => ({
          name,
          count
        }));

        // Get interaction data by category
        const interactionData: {
          name: string;
          views: number;
          clicks: number;
          saves: number;
          shares: number;
        }[] = [];

        // Create a map of categories and their interaction counts
        const categoriesSet = new Set<string>();
        if (categoryResponse.data) {
          categoryResponse.data.forEach(item => {
            if (item.category) categoriesSet.add(item.category);
          });
        }

        // For each unique category, count the different interaction types
        for (const categoryName of categoriesSet) {
          const viewsForCategory = await supabase
            .from('product_analytics')
            .select('*')
            .eq('category', categoryName)
            .eq('interaction_type', 'view');
            
          const clicksForCategory = await supabase
            .from('product_analytics')
            .select('*')
            .eq('category', categoryName)
            .eq('interaction_type', 'click');
            
          const savesForCategory = await supabase
            .from('product_analytics')
            .select('*')
            .eq('category', categoryName)
            .eq('interaction_type', 'save');
            
          const sharesForCategory = await supabase
            .from('product_analytics')
            .select('*')
            .eq('category', categoryName)
            .eq('interaction_type', 'share');
            
          interactionData.push({
            name: categoryName,
            views: viewsForCategory.data?.length || 0,
            clicks: clicksForCategory.data?.length || 0,
            saves: savesForCategory.data?.length || 0,
            shares: sharesForCategory.data?.length || 0
          });
        }

        return {
          totalViews,
          totalClicks,
          totalSaved,
          conversionRate,
          categoryData,
          interactionData
        };
      } catch (error) {
        console.error('Error fetching product analytics:', error);
        throw error;
      }
    },
    initialData: {
      totalViews: 0,
      totalClicks: 0,
      totalSaved: 0,
      conversionRate: 0,
      categoryData: [],
      interactionData: []
    }
  });

  // Fetch top products by views
  const { data: topProductsViews } = useQuery({
    queryKey: ['topProductsViews'],
    queryFn: async (): Promise<TopProductAnalytics[]> => {
      try {
        // Fetch products with view counts
        const response = await supabase
          .from('product_analytics')
          .select('product_id, product_name, category')
          .eq('interaction_type', 'view')
          .not('product_id', 'is', null);

        if (response.error) throw response.error;
        
        // Count views by product
        const productViewCounts = new Map<string, {name: string, category: string, count: number}>();
        
        if (response.data) {
          response.data.forEach(item => {
            if (!item.product_id) return;
            
            const entry = productViewCounts.get(item.product_id) || {
              name: item.product_name || 'Unknown Product',
              category: item.category || 'Uncategorized',
              count: 0
            };
            
            productViewCounts.set(item.product_id, {
              ...entry,
              count: entry.count + 1
            });
          });
        }

        // Convert to array and sort
        const topViews = Array.from(productViewCounts.entries())
          .map(([id, data]) => ({
            id,
            name: data.name,
            category: data.category,
            count: data.count,
            percentage: 0,
            views: data.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return topViews;
      } catch (error) {
        console.error('Error fetching top viewed products:', error);
        return [];
      }
    },
    initialData: []
  });

  // Fetch top products by clicks
  const { data: topProductsClicks } = useQuery({
    queryKey: ['topProductsClicks'],
    queryFn: async (): Promise<TopProductAnalytics[]> => {
      try {
        // Fetch products with click counts
        const response = await supabase
          .from('product_analytics')
          .select('product_id, product_name, category')
          .eq('interaction_type', 'click')
          .not('product_id', 'is', null);

        if (response.error) throw response.error;
        
        // Count clicks by product
        const productClickCounts = new Map<string, {name: string, category: string, count: number}>();
        
        if (response.data) {
          response.data.forEach(item => {
            if (!item.product_id) return;
            
            const entry = productClickCounts.get(item.product_id) || {
              name: item.product_name || 'Unknown Product',
              category: item.category || 'Uncategorized',
              count: 0
            };
            
            productClickCounts.set(item.product_id, {
              ...entry,
              count: entry.count + 1
            });
          });
        }

        // Convert to array and sort
        const topClicks = Array.from(productClickCounts.entries())
          .map(([id, data]) => ({
            id,
            name: data.name,
            category: data.category,
            count: data.count,
            percentage: 0,
            clicks: data.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return topClicks;
      } catch (error) {
        console.error('Error fetching top clicked products:', error);
        return [];
      }
    },
    initialData: []
  });

  // Fetch most saved products
  const { data: mostSavedProducts } = useQuery({
    queryKey: ['mostSavedProducts'],
    queryFn: async (): Promise<TopProductAnalytics[]> => {
      try {
        // Fetch products with save counts
        const response = await supabase
          .from('product_analytics')
          .select('product_id, product_name, category')
          .eq('interaction_type', 'save')
          .not('product_id', 'is', null);

        if (response.error) throw response.error;
        
        // Count saves by product
        const productSaveCounts = new Map<string, {name: string, category: string, count: number}>();
        
        if (response.data) {
          response.data.forEach(item => {
            if (!item.product_id) return;
            
            const entry = productSaveCounts.get(item.product_id) || {
              name: item.product_name || 'Unknown Product',
              category: item.category || 'Uncategorized',
              count: 0
            };
            
            productSaveCounts.set(item.product_id, {
              ...entry,
              count: entry.count + 1
            });
          });
        }

        // Convert to array and sort
        const topSaves = Array.from(productSaveCounts.entries())
          .map(([id, data]) => ({
            id,
            name: data.name,
            category: data.category,
            count: data.count,
            percentage: 0,
            saves: data.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        return topSaves;
      } catch (error) {
        console.error('Error fetching most saved products:', error);
        return [];
      }
    },
    initialData: []
  });

  // Process the top products data to include percentages
  const processedTopProducts = {
    views: topProductsViews.map(product => ({
      ...product,
      percentage: analyticsData.totalViews > 0 
        ? (product.count / analyticsData.totalViews) * 100 
        : 0
    })),
    clicks: topProductsClicks.map(product => ({
      ...product,
      percentage: analyticsData.totalClicks > 0 
        ? (product.count / analyticsData.totalClicks) * 100 
        : 0
    })),
    saves: mostSavedProducts.map(product => ({
      ...product,
      percentage: analyticsData.totalSaved > 0 
        ? (product.count / analyticsData.totalSaved) * 100 
        : 0
    }))
  };

  return {
    analyticsData,
    topProducts: processedTopProducts,
    mostSavedProducts: processedTopProducts.saves,
    isLoading,
    error,
    refetch
  };
};
