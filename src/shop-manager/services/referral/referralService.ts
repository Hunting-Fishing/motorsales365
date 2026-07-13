
import { supabase } from "@/integrations/supabase/client";
import { 
  ReferralSource, 
  CustomerReferral, 
  ReferralTransaction,
  CustomerReferralView,
  ReferralStatistics
} from "@/types/referral";

/**
 * Fetches all referral sources from the database
 */
export const getReferralSources = async (): Promise<ReferralSource[]> => {
  const { data, error } = await supabase
    .from('referral_sources')
    .select('*')
    .order('name');

  if (error) {
    console.error("Error fetching referral sources:", error);
    throw error;
  }

  return data as ReferralSource[];
};

/**
 * Fetches active referral sources from the database
 */
export const getActiveReferralSources = async (): Promise<ReferralSource[]> => {
  const { data, error } = await supabase
    .from('referral_sources')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error("Error fetching active referral sources:", error);
    throw error;
  }

  return data as ReferralSource[];
};

/**
 * Creates a new customer referral
 */
export const createCustomerReferral = async (referral: {
  referrer_id: string;
  referred_id: string;
  notes?: string;
}): Promise<CustomerReferral> => {
  const { data, error } = await supabase
    .from('customer_referrals')
    .insert({
      referrer_id: referral.referrer_id,
      referred_id: referral.referred_id,
      notes: referral.notes || null
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating customer referral:", error);
    throw error;
  }

  return data as CustomerReferral;
};

/**
 * Updates a customer referral
 */
export const updateCustomerReferral = async (
  referralId: string,
  updates: Partial<CustomerReferral>
): Promise<CustomerReferral> => {
  const { data, error } = await supabase
    .from('customer_referrals')
    .update(updates)
    .eq('id', referralId)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer referral:", error);
    throw error;
  }

  return data as CustomerReferral;
};

/**
 * Processes a referral reward
 */
export const processReferralReward = async (
  referralId: string,
  points: number = 100
): Promise<string> => {
  const { data, error } = await supabase
    .rpc('process_referral_reward', {
      referral_id: referralId,
      points: points
    });

  if (error) {
    console.error("Error processing referral reward:", error);
    throw error;
  }

  return data as string;
};

/**
 * Gets referrals made by a specific customer
 */
export const getReferralsByReferrer = async (referrerId: string): Promise<CustomerReferralView[]> => {
  const { data, error } = await supabase
    .from('customer_referrals_view')
    .select('*')
    .eq('referrer_id', referrerId)
    .order('referral_date', { ascending: false });

  if (error) {
    console.error("Error fetching referrals by referrer:", error);
    throw error;
  }

  return data as CustomerReferralView[];
};

/**
 * Gets referrals that led to a specific customer
 */
export const getReferralsForCustomer = async (referredId: string): Promise<CustomerReferralView[]> => {
  const { data, error } = await supabase
    .from('customer_referrals_view')
    .select('*')
    .eq('referred_id', referredId)
    .order('referral_date', { ascending: false });

  if (error) {
    console.error("Error fetching referrals for customer:", error);
    throw error;
  }

  return data as CustomerReferralView[];
};

/**
 * Gets all referral transactions
 */
export const getReferralTransactions = async (): Promise<ReferralTransaction[]> => {
  const { data, error } = await supabase
    .from('referral_transactions')
    .select('*')
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error("Error fetching referral transactions:", error);
    throw error;
  }

  return data as ReferralTransaction[];
};

/**
 * Gets referral transactions for a specific customer
 */
export const getCustomerReferralTransactions = async (
  customerId: string
): Promise<ReferralTransaction[]> => {
  const { data, error } = await supabase
    .from('referral_transactions')
    .select('*')
    .eq('referrer_id', customerId)
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error("Error fetching customer referral transactions:", error);
    throw error;
  }

  return data as ReferralTransaction[];
};

/**
 * Gets statistics about referrals
 */
export const getReferralStatistics = async (): Promise<ReferralStatistics> => {
  // Get total referrals
  const { count: totalCount, error: totalError } = await supabase
    .from('customer_referrals')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error("Error counting total referrals:", totalError);
    throw totalError;
  }

  // Get converted referrals
  const { count: convertedCount, error: convertedError } = await supabase
    .from('customer_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'converted');

  if (convertedError) {
    console.error("Error counting converted referrals:", convertedError);
    throw convertedError;
  }

  // Get pending referrals
  const { count: pendingCount, error: pendingError } = await supabase
    .from('customer_referrals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (pendingError) {
    console.error("Error counting pending referrals:", pendingError);
    throw pendingError;
  }

  // Get total points awarded
  const { data: pointsData, error: pointsError } = await supabase
    .from('referral_transactions')
    .select('points_awarded');

  if (pointsError) {
    console.error("Error fetching points data:", pointsError);
    throw pointsError;
  }

  const totalPointsAwarded = pointsData.reduce((sum, item) => sum + item.points_awarded, 0);
  
  return {
    totalReferrals: totalCount || 0,
    convertedReferrals: convertedCount || 0,
    pendingReferrals: pendingCount || 0,
    conversionRate: totalCount ? (convertedCount / totalCount) * 100 : 0,
    totalPointsAwarded
  };
};
