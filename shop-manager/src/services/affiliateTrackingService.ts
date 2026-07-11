import { supabase } from '@/integrations/supabase/client';

export interface AffiliateClickData {
  linkUrl: string;
  linkType: 'banner' | 'sidebar';
  moduleId?: string;
  referrerPath: string;
  metadata?: Record<string, any>;
}

export interface AffiliateClickRecord {
  id: string;
  link_url: string;
  link_type: string;
  module_id: string | null;
  user_id: string | null;
  session_id: string | null;
  referrer_path: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Track an affiliate link click
 * Non-blocking - errors are logged but don't affect user experience
 */
export const trackAffiliateClick = async (data: AffiliateClickData): Promise<void> => {
  try {
    const { error } = await supabase
      .from('affiliate_link_clicks')
      .insert({
        link_url: data.linkUrl,
        link_type: data.linkType,
        module_id: data.moduleId || null,
        referrer_path: data.referrerPath,
        metadata: data.metadata || {},
      });

    if (error) {
      console.error('Error tracking affiliate click:', error);
    }
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    // Silently fail - analytics should never break user experience
  }
};

/**
 * Fetch affiliate analytics data for the specified number of days
 */
export const getAffiliateAnalytics = async (days: number = 30): Promise<AffiliateClickRecord[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('affiliate_link_clicks')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate analytics:', error);
    throw error;
  }

  return (data || []) as AffiliateClickRecord[];
};

/**
 * Get total click count
 */
export const getTotalClickCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('affiliate_link_clicks')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error getting total click count:', error);
    return 0;
  }

  return count || 0;
};
