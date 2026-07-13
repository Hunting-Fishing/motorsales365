
import { supabase } from "@/integrations/supabase/client";
import { CustomerLoyalty, LoyaltyTransaction } from "@/types/loyalty";
import { getCustomerLoyalty, createCustomerLoyalty } from './customerLoyaltyService';
import { calculateTier } from './tierService';
import { useShopId } from "@/hooks/useShopId";

// Add points to customer
export const addCustomerPoints = async (
  customerId: string, 
  points: number, 
  shopId: string,
  transactionType: 'earn' | 'adjust', 
  description?: string,
  referenceId?: string,
  referenceType?: string
): Promise<{ loyalty: CustomerLoyalty, transaction: LoyaltyTransaction }> => {
  // First, get current loyalty data
  let loyalty = await getCustomerLoyalty(customerId);
  
  if (!loyalty) {
    loyalty = await createCustomerLoyalty(customerId, shopId);
  }

  // Calculate new values
  const newCurrentPoints = loyalty.current_points + points;
  const newLifetimePoints = loyalty.lifetime_points + (points > 0 ? points : 0); // Only add positive points to lifetime
  
  // Update tier based on lifetime points
  const newTier = await calculateTier(newLifetimePoints, shopId);

  // Create transaction record
  const transaction = await createLoyaltyTransaction({
    customer_id: customerId,
    points,
    transaction_type: transactionType,
    description,
    reference_id: referenceId,
    reference_type: referenceType
  });

  // Update loyalty record
  const { data, error } = await supabase
    .from("customer_loyalty")
    .update({
      current_points: newCurrentPoints,
      lifetime_points: newLifetimePoints,
      tier: newTier.name
    })
    .eq("id", loyalty.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating customer loyalty:", error);
    throw error;
  }

  return { 
    loyalty: {
      id: data.id,
      customer_id: data.customer_id,
      current_points: data.current_points,
      lifetime_points: data.lifetime_points,
      lifetime_value: data.lifetime_value,
      tier: data.tier,
      created_at: data.created_at,
      updated_at: data.updated_at
    }, 
    transaction 
  };
};

// Create a loyalty transaction
export const createLoyaltyTransaction = async (transaction: {
  customer_id: string;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'adjust';
  description?: string;
  reference_id?: string;
  reference_type?: string;
}): Promise<LoyaltyTransaction> => {
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .insert(transaction)
    .select()
    .single();

  if (error) {
    console.error("Error creating loyalty transaction:", error);
    throw error;
  }

  return data as LoyaltyTransaction;
};

// Get loyalty transactions for a customer
export const getCustomerTransactions = async (customerId: string): Promise<LoyaltyTransaction[]> => {
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer transactions:", error);
    throw error;
  }

  return data as LoyaltyTransaction[];
};
