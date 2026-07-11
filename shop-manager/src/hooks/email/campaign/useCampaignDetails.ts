
import { useState } from 'react';
import { EmailCampaign } from '@/types/email';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { validateCampaignStatus, parseJsonField, parseABTest } from './utils/emailCampaignUtils';
import { fetchCampaignAnalyticsData } from './utils/campaignAnalyticsUtils';
import { useABTestVariants } from './useABTestVariants';

export const useCampaignDetails = () => {
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const { toast } = useToast();
  const { abTestLoading, updateABTestVariantMetrics, selectABTestWinner } = useABTestVariants();

  const fetchCampaignDetails = async (campaignId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      const segment_ids = parseJsonField(data.segment_ids, []);
      const recipient_ids = parseJsonField(data.recipient_ids, []);
      const personalizations = parseJsonField(data.personalizations, {});
      const metadata = parseJsonField(data.metadata, {});
      const ab_test = parseABTest(data.ab_test);
      
      const formattedCampaign: EmailCampaign = {
        id: data.id,
        name: data.name,
        subject: data.subject,
        body: data.content || '',
        content: data.content,
        status: validateCampaignStatus(data.status),
        template_id: data.template_id,
        segment_ids: segment_ids,
        segment_id: undefined,
        recipient_ids: recipient_ids,
        recipientIds: recipient_ids,
        personalizations: personalizations,
        metadata: metadata,
        abTest: ab_test,
        ab_test: ab_test,
        scheduled_at: data.scheduled_date,
        scheduledAt: data.scheduled_date,
        sent_at: data.sent_date,
        sentAt: data.sent_date,
        created_at: data.created_at,
        createdAt: data.created_at,
        updated_at: data.updated_at,
        updatedAt: data.updated_at,
        totalRecipients: data.total_recipients,
        total_recipients: data.total_recipients,
        opened: data.opened,
        clicked: data.clicked
      };
      
      fetchCampaignAnalytics(campaignId).catch(console.error);
      
      setCampaign(formattedCampaign);
      return formattedCampaign;
    } catch (error) {
      console.error("Error fetching campaign details:", error);
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignAnalytics = async (campaignId: string) => {
    setAnalyticsLoading(true);
    try {
      const analyticsData = await fetchCampaignAnalyticsData(campaignId);
      
      if (Object.keys(analyticsData).length > 0) {
        setCampaign(prevCampaign => {
          if (!prevCampaign) return null;
          
          return {
            ...prevCampaign,
            ...analyticsData
          };
        });
      }

      const variants = await updateABTestVariantMetrics(campaignId, campaign);
      
      if (variants) {
        setCampaign(prevCampaign => {
          if (!prevCampaign || !prevCampaign.abTest) return prevCampaign;
          
          return {
            ...prevCampaign,
            abTest: {
              ...prevCampaign.abTest,
              variants
            }
          };
        });
      }
    } catch (error) {
      console.error("Error fetching campaign analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load campaign analytics",
        variant: "destructive",
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSelectABTestWinner = async (campaignId: string, forceWinnerId?: string) => {
    const result = await selectABTestWinner(campaignId, forceWinnerId, campaign);
    
    if (result) {
      setCampaign(prevCampaign => {
        if (!prevCampaign || !prevCampaign.abTest) return prevCampaign;
        
        return {
          ...prevCampaign,
          abTest: {
            ...prevCampaign.abTest,
            winnerId: result.winnerId,
            winnerSelectionDate: result.winnerSelectionDate,
            variants: result.updatedVariants,
            confidenceLevel: result.confidenceLevel
          }
        };
      });

      return result.winnerId;
    }
    
    return null;
  };

  return {
    campaign,
    loading: loading || analyticsLoading || abTestLoading,
    fetchCampaignDetails,
    fetchCampaignAnalytics,
    selectABTestWinner: handleSelectABTestWinner,
    updateABTestVariantMetrics
  };
};
