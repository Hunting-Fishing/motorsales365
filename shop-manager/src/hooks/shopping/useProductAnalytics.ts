import { useCallback } from 'react';
import { InteractionType } from '@/services/productAnalyticsService';
import { supabase } from '@/integrations/supabase/client';
import { addRecentlyViewedProduct } from '@/services/recentlyViewedService';

export interface ProductInteractionData {
  productId: string;
  productName: string;
  category?: string;
  interactionType: InteractionType;
  metadata?: Record<string, any>;
}

export const useProductAnalytics = () => {
  const trackInteraction = useCallback(async (data: ProductInteractionData) => {
    try {
      // Track the interaction in analytics using the new function
      await supabase.rpc('track_product_interaction', {
        p_product_id: data.productId,
        p_product_name: data.productName,
        p_category: data.category,
        p_interaction_type: data.interactionType,
        p_metadata: data.metadata || {}
      });

      // If it's a view interaction, also add to recently viewed using the new function
      if (data.interactionType === 'view') {
        await supabase.rpc('add_recently_viewed_product', {
          p_product_id: data.productId,
          p_product_name: data.productName,
          p_category: data.category
        });
      }
    } catch (error) {
      console.error('Error tracking product interaction:', error);
      // Don't throw error - analytics should not break user experience
    }
  }, []);

  return { trackInteraction };
};