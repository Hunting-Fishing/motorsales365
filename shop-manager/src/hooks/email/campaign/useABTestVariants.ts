
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EmailCampaign } from '@/types/email';
import { abTestingService } from '@/services/email';
import { useToast } from '@/hooks/use-toast';

export const useABTestVariants = () => {
  const [abTestLoading, setAbTestLoading] = useState(false);
  const { toast } = useToast();

  const updateABTestVariantMetrics = async (campaignId: string, currentCampaign: EmailCampaign | null = null) => {
    if (!currentCampaign?.abTest?.enabled) return null;

    try {
      const variants = currentCampaign.abTest.variants;
      const updatedVariants = await Promise.all(variants.map(async (variant) => {
        // @ts-ignore - custom query
        const { data: events } = await supabase
          .from('email_events')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('event_type', 'opened');
        
        const variantEvents = events?.filter(event => 
          event.event_data && 
          typeof event.event_data === 'object' && 
          'variant_id' in event.event_data && 
          event.event_data.variant_id === variant.id
        ) || [];
        
        const openCount = variantEvents.length;
        
        // @ts-ignore - custom query
        const { data: clickEvents } = await supabase
          .from('email_events')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('event_type', 'clicked');
        
        const variantClickEvents = clickEvents?.filter(event => 
          event.event_data && 
          typeof event.event_data === 'object' && 
          'variant_id' in event.event_data && 
          event.event_data.variant_id === variant.id
        ) || [];
        
        const clickCount = variantClickEvents.length;
        
        const openRate = variant.recipients > 0 ? openCount / variant.recipients : 0;
        const clickRate = variant.recipients > 0 ? clickCount / variant.recipients : 0;
        const clickToOpenRate = openCount > 0 ? clickCount / openCount : 0;
        
        return {
          ...variant,
          opened: openCount,
          clicked: clickCount,
          metrics: {
            openRate: openRate,
            clickRate: clickRate,
            clickToOpenRate: clickToOpenRate
          }
        };
      }));

      return updatedVariants;
    } catch (error) {
      console.error("Error updating A/B test metrics:", error);
      return null;
    }
  };

  const selectABTestWinner = async (campaignId: string, forceWinnerId?: string, campaign?: EmailCampaign) => {
    setAbTestLoading(true);
    try {
      if (!campaign?.abTest?.enabled) {
        throw new Error("A/B testing is not enabled for this campaign");
      }

      const { data, error } = await abTestingService.selectABTestWinner(campaignId, forceWinnerId);
      
      if (error || !data) {
        throw new Error(error || "Failed to determine a winner");
      }

      const winnerId = data.winnerId;
      const winnerSelectionDate = data.winnerSelectionDate;
      const confidenceLevel = data.confidenceLevel;

      if (!winnerId) {
        throw new Error("Failed to determine a winner");
      }

      // Update variants with improvement data
      let updatedVariants = [];
      if (campaign?.abTest?.variants) {
        updatedVariants = campaign.abTest.variants.map(variant => {
          const isWinner = variant.id === winnerId;
          
          let improvement = undefined;
          if (isWinner) {
            const winnerMetric = campaign.abTest.winnerCriteria === 'open_rate' 
              ? variant.metrics?.openRate 
              : variant.metrics?.clickRate;
              
            const otherVariants = campaign.abTest.variants.filter(v => v.id !== winnerId);
            const otherMetrics = otherVariants.map(v => 
              campaign.abTest.winnerCriteria === 'open_rate' 
                ? v.metrics?.openRate 
                : v.metrics?.clickRate
            ).filter(rate => rate !== undefined);
            
            const avgOtherRate = otherMetrics.length > 0 
              ? otherMetrics.reduce((sum, rate) => sum + (rate || 0), 0) / otherMetrics.length 
              : 0;
            
            if (winnerMetric && avgOtherRate > 0) {
              improvement = ((winnerMetric - avgOtherRate) / avgOtherRate) * 100;
            }
          }
          
          return {
            ...variant,
            improvement: isWinner ? improvement : undefined
          };
        });
      }

      toast({
        title: "Winner Selected",
        description: `A/B test winner has been selected${confidenceLevel ? ` with ${confidenceLevel}% confidence` : ''}`,
      });

      return {
        winnerId,
        winnerSelectionDate,
        confidenceLevel,
        updatedVariants
      };
    } catch (error) {
      console.error("Error selecting A/B test winner:", error);
      toast({
        title: "Error",
        description: "Failed to select A/B test winner",
        variant: "destructive",
      });
      return null;
    } finally {
      setAbTestLoading(false);
    }
  };

  return {
    abTestLoading,
    updateABTestVariantMetrics,
    selectABTestWinner
  };
};
