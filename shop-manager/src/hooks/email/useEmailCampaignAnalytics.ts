import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { EmailCampaignAnalytics, EmailCampaignTimelinePoint } from '@/types/email';

export const useEmailCampaignAnalytics = () => {
  const [analytics, setAnalytics] = useState<EmailCampaignAnalytics | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [geoData, setGeoData] = useState<Record<string, number> | null>(null);
  const [deviceData, setDeviceData] = useState<any | null>(null);
  const [linkData, setLinkData] = useState<Record<string, number> | null>(null);
  const [comparisonData, setComparisonData] = useState<any[] | null>(null);
  const [selectedCampaignsForComparison, setSelectedCampaignsForComparison] = useState<string[]>([]);
  const { toast } = useToast();

  /**
   * Fetch detailed analytics for a campaign
   */
  const fetchCampaignAnalytics = async (campaignId: string) => {
    setLoading(true);
    try {
      // First try to get from the analytics table
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('email_campaign_analytics')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();
      
      // If we have analytics data
      if (analyticsData && !analyticsError) {
        // Parse timeline data
        let timelineData: EmailCampaignTimelinePoint[] = [];
        if (analyticsData.timeline) {
          try {
            // If it's already an array of objects, use it directly
            if (Array.isArray(analyticsData.timeline)) {
              timelineData = analyticsData.timeline.map((point: any) => ({
                date: point.date || '',
                opens: Number(point.opens) || 0,
                clicks: Number(point.clicks) || 0,
                unsubscribes: Number(point.unsubscribes) || 0,
                complaints: Number(point.complaints) || 0
              }));
            } else {
              // Otherwise try to parse as JSON
              const parsed = typeof analyticsData.timeline === 'string' 
                ? JSON.parse(analyticsData.timeline) 
                : analyticsData.timeline;
              
              if (Array.isArray(parsed)) {
                timelineData = parsed.map(point => ({
                  date: point.date || '',
                  opens: Number(point.opens) || 0,
                  clicks: Number(point.clicks) || 0,
                  unsubscribes: Number(point.unsubscribes) || 0,
                  complaints: Number(point.complaints) || 0
                }));
              }
            }
          } catch (e) {
            console.error("Error parsing timeline data:", e);
            timelineData = [];
          }
        }
        
        // Format the analytics data
        const formattedAnalytics: EmailCampaignAnalytics = {
          id: analyticsData.id,
          name: analyticsData.name,
          campaign_id: analyticsData.campaign_id,
          sent: analyticsData.sent,
          delivered: analyticsData.delivered,
          opened: analyticsData.opened,
          clicked: analyticsData.clicked,
          bounced: analyticsData.bounced,
          complained: analyticsData.complained,
          unsubscribed: analyticsData.unsubscribed,
          total_sent: analyticsData.sent,
          total_delivered: analyticsData.delivered,
          total_opened: analyticsData.opened,
          total_clicked: analyticsData.clicked,
          total_bounced: analyticsData.bounced,
          total_complained: analyticsData.complained,
          total_unsubscribed: analyticsData.unsubscribed,
          open_rate: analyticsData.open_rate,
          click_rate: analyticsData.click_rate,
          click_to_open_rate: analyticsData.click_to_open_rate,
          bounced_rate: analyticsData.bounced_rate,
          unsubscribe_rate: analyticsData.unsubscribe_rate,
          timeline: timelineData,
          created_at: analyticsData.created_at,
          updated_at: analyticsData.updated_at
        };
        
        setAnalytics(formattedAnalytics);
        return formattedAnalytics;
      }
      
      // If no analytics data, we need to calculate from events
      // Get the campaign details first
      const { data: campaignData, error: campaignError } = await supabase
        .from('email_campaigns')
        .select('name, total_recipients')
        .eq('id', campaignId)
        .single();
      
      if (campaignError) throw campaignError;
      
      // Count the basic metrics from events table
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
      
      const { data: bounceData, error: bounceError } = await supabase.rpc(
        'count_email_events',
        { 
          campaign_id_param: campaignId,
          event_type_param: 'bounced'
        }
      );
      
      const { data: complaintData, error: complaintError } = await supabase.rpc(
        'count_email_events',
        { 
          campaign_id_param: campaignId,
          event_type_param: 'complained'
        }
      );
      
      const { data: unsubscribeData, error: unsubscribeError } = await supabase.rpc(
        'count_email_events',
        { 
          campaign_id_param: campaignId,
          event_type_param: 'unsubscribed'
        }
      );
      
      if (openError || clickError || bounceError || complaintError || unsubscribeError) {
        throw new Error("Error fetching event counts");
      }
      
      // Calculate rates
      const totalSent = campaignData.total_recipients || 0;
      const opened = openData || 0;
      const clicked = clickData || 0;
      const bounced = bounceData || 0;
      const complained = complaintData || 0;
      const unsubscribed = unsubscribeData || 0;
      
      const openRate = totalSent > 0 ? opened / totalSent : 0;
      const clickRate = totalSent > 0 ? clicked / totalSent : 0;
      const clickToOpenRate = opened > 0 ? clicked / opened : 0;
      const bouncedRate = totalSent > 0 ? bounced / totalSent : 0;
      const unsubscribeRate = totalSent > 0 ? unsubscribed / totalSent : 0;
      
      // Get daily timeline data
      // @ts-ignore - custom query
      const { data: timelineData, error: timelineError } = await supabase
        .from('email_events')
        .select('event_type, created_at')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });
      
      if (timelineError) throw timelineError;
      
      // Process timeline data
      const timelinePoints: Record<string, EmailCampaignTimelinePoint> = {};
      
      if (timelineData && timelineData.length > 0) {
        timelineData.forEach((event: any) => {
          const date = new Date(event.created_at).toISOString().split('T')[0];
          
          if (!timelinePoints[date]) {
            timelinePoints[date] = {
              date,
              opens: 0,
              clicks: 0,
              unsubscribes: 0,
              complaints: 0
            };
          }
          
          if (event.event_type === 'opened') {
            timelinePoints[date].opens++;
          } else if (event.event_type === 'clicked') {
            timelinePoints[date].clicks++;
          } else if (event.event_type === 'unsubscribed') {
            timelinePoints[date].unsubscribes = (timelinePoints[date].unsubscribes || 0) + 1;
          } else if (event.event_type === 'complained') {
            timelinePoints[date].complaints = (timelinePoints[date].complaints || 0) + 1;
          }
        });
      }
      
      const timeline = Object.values(timelinePoints).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Create analytics object
      const newAnalytics: EmailCampaignAnalytics = {
        id: `${campaignId}-analytics`,
        name: campaignData.name,
        campaign_id: campaignId,
        sent: totalSent,
        delivered: totalSent - bounced,
        opened,
        clicked,
        bounced,
        complained,
        unsubscribed,
        total_sent: totalSent,
        total_delivered: totalSent - bounced,
        total_opened: opened,
        total_clicked: clicked,
        total_bounced: bounced,
        total_complained: complained,
        total_unsubscribed: unsubscribed,
        open_rate: openRate,
        click_rate: clickRate,
        click_to_open_rate: clickToOpenRate,
        bounced_rate: bouncedRate,
        unsubscribe_rate: unsubscribeRate,
        timeline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setAnalytics(newAnalytics);
      return newAnalytics;
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load campaign analytics",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // For basic implementation to fix errors
  const compareCampaigns = async (campaignId: string, campaignIds?: string[]) => {
    // Implementation goes here
    console.log("Comparing campaigns", campaignId, campaignIds);
  };

  return {
    analytics,
    campaignDetails,
    loading,
    error,
    geoData,
    deviceData,
    linkData,
    fetchCampaignAnalytics,
    compareCampaigns,
    comparisonData,
    selectedCampaignsForComparison
  };
};
