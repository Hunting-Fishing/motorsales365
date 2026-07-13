
import { supabase } from "@/lib/supabase";
import { LoyaltyTier } from "@/types/loyalty";

// Function to calculate tier based on lifetime points
export const calculateTier = async (lifetimePoints: number, shopId: string): Promise<LoyaltyTier> => {
  // Fetch tiers sorted by threshold descending
  const { data: tiers, error } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('shop_id', shopId)
    .order('threshold', { ascending: false });
  
  if (error) {
    console.error('Error fetching loyalty tiers:', error);
    // Return default tier on error
    return {
      name: 'Standard',
      threshold: 0,
      benefits: 'Basic loyalty program benefits',
      multiplier: 1,
      color: 'green'
    };
  }
  
  if (!tiers || tiers.length === 0) {
    // Return default tier if no tiers are defined
    return {
      name: 'Standard',
      threshold: 0,
      benefits: 'Basic loyalty program benefits',
      multiplier: 1,
      color: 'green'
    };
  }
  
  // Find the highest tier the customer qualifies for
  for (const tier of tiers) {
    if (lifetimePoints >= tier.threshold) {
      return tier;
    }
  }
  
  // If no tier matches, return the lowest tier (which should have threshold 0)
  return tiers[tiers.length - 1];
};

// Get all tiers for a shop
export const getShopTiers = async (shopId: string): Promise<LoyaltyTier[]> => {
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('shop_id', shopId)
    .order('threshold', { ascending: true });
    
  if (error) {
    console.error('Error fetching loyalty tiers:', error);
    throw error;
  }
  
  return data || [];
};

// Get tier by ID
export const getTierById = async (tierId: string): Promise<LoyaltyTier | null> => {
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('id', tierId)
    .single();
    
  if (error) {
    console.error('Error fetching loyalty tier:', error);
    return null;
  }
  
  return data;
};

// Get tier details by name
export const getTierByName = async (tierName: string, shopId: string): Promise<LoyaltyTier | null> => {
  const { data, error } = await supabase
    .from('loyalty_tiers')
    .select('*')
    .eq('name', tierName)
    .eq('shop_id', shopId)
    .single();
    
  if (error) {
    console.error('Error fetching loyalty tier by name:', error);
    return null;
  }
  
  return data;
};
