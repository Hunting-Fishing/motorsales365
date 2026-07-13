import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchAnalyticsData {
  query: string;
  resultsCount: number;
  filtersUsed?: Record<string, any>;
  searchTimeMs?: number;
}

export const useSearchAnalytics = () => {
  const trackSearch = useCallback(async (data: SearchAnalyticsData) => {
    try {
      await supabase.rpc('track_search_analytics', {
        p_query: data.query,
        p_results_count: data.resultsCount,
        p_filters_used: data.filtersUsed || {},
        p_search_time_ms: data.searchTimeMs
      });
    } catch (error) {
      console.error('Error tracking search analytics:', error);
      // Don't throw error - analytics should not break user experience
    }
  }, []);

  return { trackSearch };
};