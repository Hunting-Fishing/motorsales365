
import { supabase } from '@/lib/supabase';
import { GenericResponse } from '../utils/supabaseHelper';
import { EmailABTest } from '@/types/email';

export interface ABTestWinnerResult {
  winnerId: string;
  winnerSelectionDate: string;
  confidenceLevel?: number;
}

/**
 * Service for AB testing functionality
 */
export const abTestingService = {
  /**
   * Select a winner for an AB test
   * @param campaignId Campaign ID with the AB test
   * @param forceWinnerId Optionally force a specific variant as winner
   */
  async selectABTestWinner(
    campaignId: string,
    forceWinnerId?: string
  ): Promise<GenericResponse<ABTestWinnerResult>> {
    try {
      // First get the campaign to check if it has AB testing
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .select('ab_test')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      
      // Parse the AB test data
      const abTest = campaign?.ab_test as any;
      
      // Ensure there's a valid AB test
      if (!abTest || !abTest.enabled || abTest.variants?.length < 2) {
        return {
          data: null,
          error: new Error('No valid A/B test found for this campaign')
        };
      }

      if (abTest.winnerId) {
        return {
          data: {
            winnerId: abTest.winnerId,
            winnerSelectionDate: abTest.winnerSelectionDate,
            confidenceLevel: abTest.confidenceLevel
          },
          error: null
        };
      }

      // Use the edge function to determine the winner
      const { data: result, error } = await supabase.functions.invoke(
        'select-abtest-winner',
        {
          body: {
            campaignId,
            forceWinnerId
          }
        }
      );

      if (error) throw error;

      // Store the winner in the campaign
      const updatedTest = {
        ...abTest,
        winnerId: result.winnerId,
        winnerSelectionDate: new Date().toISOString(),
        confidenceLevel: result.confidenceLevel
      };

      // Update the campaign with the winner information
      const { error: updateError } = await supabase
        .from('email_campaigns')
        .update({
          ab_test: updatedTest
        })
        .eq('id', campaignId);

      if (updateError) throw updateError;

      return {
        data: {
          winnerId: result.winnerId,
          winnerSelectionDate: updatedTest.winnerSelectionDate,
          confidenceLevel: result.confidenceLevel
        },
        error: null
      };
    } catch (error) {
      console.error('Error selecting AB test winner:', error);
      return { data: null, error };
    }
  }
};
