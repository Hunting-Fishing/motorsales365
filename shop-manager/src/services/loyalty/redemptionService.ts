
import { supabase } from "@/integrations/supabase/client";
import { CustomerLoyalty, LoyaltyRedemption } from "@/types/loyalty";
import { getCustomerLoyalty } from './customerLoyaltyService';
import { createLoyaltyTransaction } from './transactionService';
import { toast } from "sonner";

// Redeem points for a reward
export const redeemPoints = async (
  customerId: string, 
  rewardId: string, 
  pointsCost: number
): Promise<{ redemption: LoyaltyRedemption, updatedLoyalty: CustomerLoyalty }> => {
  // First, check if customer has enough points
  const loyalty = await getCustomerLoyalty(customerId);
  
  if (!loyalty) {
    throw new Error("Customer loyalty profile not found");
  }
  
  if (loyalty.current_points < pointsCost) {
    throw new Error("Customer does not have enough points for this reward");
  }
  
  // Create redemption record
  const { data: redemption, error: redemptionError } = await supabase
    .from("loyalty_redemptions")
    .insert({
      customer_id: customerId,
      reward_id: rewardId,
      points_used: pointsCost,
      status: 'pending' as const
    })
    .select()
    .single();
    
  if (redemptionError) {
    console.error("Error creating redemption:", redemptionError);
    throw redemptionError;
  }
  
  // Create transaction record for the redemption
  await createLoyaltyTransaction({
    customer_id: customerId,
    points: -pointsCost,
    transaction_type: 'redeem',
    description: `Reward redemption`,
    reference_id: redemption.id,
    reference_type: 'redemption'
  });
  
  // Update customer points
  const { data: updatedLoyalty, error: updateError } = await supabase
    .from("customer_loyalty")
    .update({
      current_points: loyalty.current_points - pointsCost
    })
    .eq("id", loyalty.id)
    .select()
    .single();
    
  if (updateError) {
    console.error("Error updating customer points:", updateError);
    throw updateError;
  }
  
  return { 
    redemption: redemption as LoyaltyRedemption, 
    updatedLoyalty: {
      id: updatedLoyalty.id,
      customer_id: updatedLoyalty.customer_id,
      current_points: updatedLoyalty.current_points,
      lifetime_points: updatedLoyalty.lifetime_points,
      lifetime_value: updatedLoyalty.lifetime_value,
      tier: updatedLoyalty.tier,
      created_at: updatedLoyalty.created_at,
      updated_at: updatedLoyalty.updated_at
    }
  };
};

// Get customer redemptions
export const getCustomerRedemptions = async (customerId: string): Promise<LoyaltyRedemption[]> => {
  const { data, error } = await supabase
    .from("loyalty_redemptions")
    .select(`
      *,
      reward:reward_id (*)
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer redemptions:", error);
    throw error;
  }

  return data as LoyaltyRedemption[];
};

// Update redemption status
export const updateRedemptionStatus = async (
  redemptionId: string, 
  status: 'pending' | 'completed' | 'cancelled',
  notes?: string
): Promise<LoyaltyRedemption> => {
  const updates: any = { status };
  
  if (status === 'completed' && !notes) {
    updates.used_at = new Date().toISOString();
  }
  
  if (notes) {
    updates.notes = notes;
  }
  
  const { data, error } = await supabase
    .from("loyalty_redemptions")
    .update(updates)
    .eq("id", redemptionId)
    .select(`
      *,
      reward:reward_id (*)
    `)
    .single();

  if (error) {
    console.error("Error updating redemption status:", error);
    throw error;
  }

  // If cancelling, refund the points
  if (status === 'cancelled') {
    try {
      // Get the redemption data
      const redemption = data as LoyaltyRedemption;
      
      // Refund points
      await createLoyaltyTransaction({
        customer_id: redemption.customer_id,
        points: redemption.points_used,
        transaction_type: 'adjust',
        description: 'Points refunded from cancelled redemption',
        reference_id: redemption.id,
        reference_type: 'refund'
      });
      
      // Update customer loyalty
      const loyalty = await getCustomerLoyalty(redemption.customer_id);
      if (loyalty) {
        await supabase
          .from("customer_loyalty")
          .update({
            current_points: loyalty.current_points + redemption.points_used
          })
          .eq("id", loyalty.id);
      }
      
      toast.success("Points have been refunded to the customer");
    } catch (err) {
      console.error("Error refunding points:", err);
      toast.error("Error refunding points");
    }
  }

  return data as LoyaltyRedemption;
};
