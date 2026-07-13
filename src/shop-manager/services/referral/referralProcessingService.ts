
import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a pending referral to converted and awards points to the referrer
 */
export const convertReferral = async (referralId: string): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-referral', {
      body: {
        referralId,
        action: 'convert'
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to convert referral');
    }

    return { 
      success: true, 
      message: `Referral converted successfully. ${data.points_awarded} points awarded.`,
      data 
    };
  } catch (error: any) {
    console.error("Error converting referral:", error);
    return { 
      success: false, 
      message: error.message || 'An unexpected error occurred' 
    };
  }
};

/**
 * Cancels a pending referral
 */
export const cancelReferral = async (referralId: string): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const { data, error } = await supabase.functions.invoke('process-referral', {
      body: {
        referralId,
        action: 'cancel'
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to cancel referral');
    }

    return { 
      success: true, 
      message: 'Referral cancelled successfully',
      data 
    };
  } catch (error: any) {
    console.error("Error cancelling referral:", error);
    return { 
      success: false, 
      message: error.message || 'An unexpected error occurred' 
    };
  }
};

/**
 * Gets referral statistics for a specific customer
 */
export const getCustomerReferralStats = async (customerId: string): Promise<{
  totalReferrals: number;
  successfulReferrals: number;
  totalPoints: number;
}> => {
  try {
    // Get total referrals
    const { count: totalCount, error: countError } = await supabase
      .from('customer_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', customerId);
      
    if (countError) throw countError;
      
    // Get successful referrals
    const { count: successCount, error: successError } = await supabase
      .from('customer_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', customerId)
      .eq('status', 'converted');
      
    if (successError) throw successError;
      
    // Get total points
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('referral_transactions')
      .select('points_awarded')
      .eq('referrer_id', customerId);
      
    if (transactionsError) throw transactionsError;
      
    const totalPoints = transactionsData.reduce((sum, item) => sum + item.points_awarded, 0);
    
    return {
      totalReferrals: totalCount || 0,
      successfulReferrals: successCount || 0,
      totalPoints
    };
  } catch (error) {
    console.error("Error getting customer referral stats:", error);
    return {
      totalReferrals: 0,
      successfulReferrals: 0,
      totalPoints: 0
    };
  }
};
