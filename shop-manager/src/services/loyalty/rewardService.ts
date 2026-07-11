
import { supabase } from "@/integrations/supabase/client";
import { LoyaltyReward } from "@/types/loyalty";

// Get available rewards
export const getAvailableRewards = async (shopId: string): Promise<LoyaltyReward[]> => {
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching available rewards:", error);
    throw error;
  }

  return data as LoyaltyReward[];
};

// Create a new reward
export const createReward = async (reward: {
  shop_id: string;
  name: string;
  description?: string;
  points_cost: number;
  is_active: boolean;
  reward_type: 'discount' | 'service' | 'product' | 'other';
  reward_value?: number;
}): Promise<LoyaltyReward> => {
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .insert(reward)
    .select()
    .single();

  if (error) {
    console.error("Error creating reward:", error);
    throw error;
  }

  return data as LoyaltyReward;
};

// Update a reward
export const updateReward = async (reward: Partial<LoyaltyReward> & { id: string }): Promise<LoyaltyReward> => {
  const { data, error } = await supabase
    .from("loyalty_rewards")
    .update(reward)
    .eq("id", reward.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating reward:", error);
    throw error;
  }

  return data as LoyaltyReward;
};

// Delete a reward
export const deleteReward = async (rewardId: string): Promise<void> => {
  const { error } = await supabase
    .from("loyalty_rewards")
    .delete()
    .eq("id", rewardId);

  if (error) {
    console.error("Error deleting reward:", error);
    throw error;
  }
};
