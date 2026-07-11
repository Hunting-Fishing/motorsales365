
import { EmailCampaign } from '@/types/email';
import { supabase } from '@/lib/supabase';

/**
 * Fetches analytics data for a campaign from the analytics table or events table
 */
export const fetchCampaignAnalyticsData = async (campaignId: string): Promise<Partial<EmailCampaign>> => {
  try {
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('email_campaign_analytics')
      .select('*')
      .eq('campaign_id', campaignId)
      .single();
    
    if (analyticsError && analyticsError.code !== 'PGRST116') {
      throw analyticsError;
    }
    
    if (analyticsData) {
      return {
        opened: analyticsData.opened,
        clicked: analyticsData.clicked,
        totalRecipients: analyticsData.sent,
        total_recipients: analyticsData.sent
      };
    } else {
      const { data: openData, error: openError } = await supabase.rpc(
        'count_email_events',
        { 
          campaign_id_param: campaignId,
          event_type_param: 'opened'
        }
      );
      
      const { data: clickData, error: clickError } = await supabase.rpc(
        'count_email_events',
        { 
          campaign_id_param: campaignId,
          event_type_param: 'clicked'
        }
      );
        
      if (openError) throw openError;
      if (clickError) throw clickError;
      
      const openCount = openData;
      const clickCount = clickData;
      
      if (openCount !== null || clickCount !== null) {
        return {
          opened: openCount || 0,
          clicked: clickCount || 0
        };
      }
    }
    return {};
  } catch (error) {
    console.error("Error fetching campaign analytics:", error);
    throw error;
  }
};
