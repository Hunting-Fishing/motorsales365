import { supabase } from '@/integrations/supabase/client';

export interface ProductPriceData {
  price?: number;
  originalPrice?: number;
  title?: string;
  availability?: string;
  imageUrl?: string;
  sourceUrl?: string;
}

export interface FirecrawlResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export const firecrawlApi = {
  async fetchProductPrice(url: string): Promise<FirecrawlResponse<ProductPriceData>> {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-product-price', {
        body: { url },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price';
      return { success: false, error: errorMessage };
    }
  },
};
