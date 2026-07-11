import React, { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchAnalyticsProps {
  query: string;
  resultsCount: number;
  filters?: Record<string, any>;
  onSearchTracked?: (searchId: string) => void;
}

export const useSearchAnalytics = () => {
  const trackSearch = useCallback(async (data: {
    query: string;
    resultsCount: number;
    filters?: Record<string, any>;
    searchTimeMs?: number;
  }) => {
    try {
      const { data: analyticsData, error } = await supabase
        .from('ai_search_analytics')
        .insert({
          query: data.query,
          results_count: data.resultsCount,
          filters_used: data.filters || {},
          search_time_ms: data.searchTimeMs,
          success_rate: data.resultsCount > 0 ? 1 : 0,
          click_through_rate: 0 // Will be updated when user clicks on results
        })
        .select()
        .single();

      if (error) throw error;
      return analyticsData?.id;
    } catch (error) {
      console.error('Error tracking search:', error);
      return null;
    }
  }, []);

  const trackSearchClick = useCallback(async (searchId: string, productId: string) => {
    try {
      // This could be implemented to track which products were clicked from search results
      console.log('Search click tracked:', { searchId, productId });
    } catch (error) {
      console.error('Error tracking search click:', error);
    }
  }, []);

  return { trackSearch, trackSearchClick };
};

const SearchAnalytics: React.FC<SearchAnalyticsProps> = ({ 
  query, 
  resultsCount, 
  filters,
  onSearchTracked 
}) => {
  const { trackSearch } = useSearchAnalytics();

  React.useEffect(() => {
    if (query.trim()) {
      const searchStartTime = Date.now();
      
      // Track the search after a brief delay to ensure results are loaded
      const timeout = setTimeout(async () => {
        const searchTime = Date.now() - searchStartTime;
        const searchId = await trackSearch({
          query: query.trim(),
          resultsCount,
          filters,
          searchTimeMs: searchTime
        });
        
        if (searchId && onSearchTracked) {
          onSearchTracked(searchId);
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [query, resultsCount, filters, trackSearch, onSearchTracked]);

  return null;
};

export default SearchAnalytics;