import { supabase } from "@/integrations/supabase/client";
import { LoyaltyPoints, LoyaltyPointTransaction } from "@/types/phase3";

export const getLoyaltyPoints = async (userId: string): Promise<LoyaltyPoints | null> => {
  try {
    const { data, error } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    // Create loyalty record if it doesn't exist
    if (!data) {
      const { data: newData, error: createError } = await supabase
        .from('loyalty_points')
        .insert({
          user_id: userId,
          points_earned: 0,
          points_spent: 0,
          points_balance: 0,
          tier: 'bronze'
        })
        .select()
        .single();

      if (createError) throw createError;
      return newData as LoyaltyPoints;
    }

    return data as LoyaltyPoints;
  } catch (error) {
    console.error('Error fetching loyalty points:', error);
    return null;
  }
};

export const getLoyaltyPointTransactions = async (
  userId: string,
  limit: number = 50
): Promise<LoyaltyPointTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('loyalty_point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as LoyaltyPointTransaction[];
  } catch (error) {
    console.error('Error fetching loyalty point transactions:', error);
    return [];
  }
};

export const addLoyaltyPoints = async (
  userId: string,
  points: number,
  description: string,
  orderId?: string
): Promise<boolean> => {
  try {
    // Start a transaction
    const { data: currentPoints, error: fetchError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newBalance = currentPoints.points_balance + points;
    const newEarned = currentPoints.points_earned + points;

    // Determine new tier based on total points earned
    let newTier = currentPoints.tier;
    if (newEarned >= 10000) newTier = 'platinum';
    else if (newEarned >= 5000) newTier = 'gold';
    else if (newEarned >= 1000) newTier = 'silver';
    else newTier = 'bronze';

    // Update loyalty points
    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        points_earned: newEarned,
        points_balance: newBalance,
        tier: newTier
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Record transaction
    const { error: transactionError } = await supabase
      .from('loyalty_point_transactions')
      .insert({
        user_id: userId,
        order_id: orderId,
        transaction_type: 'earned',
        points: points,
        description: description
      });

    if (transactionError) throw transactionError;

    return true;
  } catch (error) {
    console.error('Error adding loyalty points:', error);
    return false;
  }
};

export const spendLoyaltyPoints = async (
  userId: string,
  points: number,
  description: string,
  orderId?: string
): Promise<boolean> => {
  try {
    // Check if user has enough points
    const { data: currentPoints, error: fetchError } = await supabase
      .from('loyalty_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    if (currentPoints.points_balance < points) {
      throw new Error('Insufficient loyalty points');
    }

    const newBalance = currentPoints.points_balance - points;
    const newSpent = currentPoints.points_spent + points;

    // Update loyalty points
    const { error: updateError } = await supabase
      .from('loyalty_points')
      .update({
        points_spent: newSpent,
        points_balance: newBalance
      })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    // Record transaction
    const { error: transactionError } = await supabase
      .from('loyalty_point_transactions')
      .insert({
        user_id: userId,
        order_id: orderId,
        transaction_type: 'spent',
        points: -points, // Negative to indicate spending
        description: description
      });

    if (transactionError) throw transactionError;

    return true;
  } catch (error) {
    console.error('Error spending loyalty points:', error);
    return false;
  }
};

export const getTierBenefits = (tier: string) => {
  const benefits = {
    bronze: {
      pointsMultiplier: 1,
      freeShippingThreshold: 100,
      earlyAccess: false,
      specialDiscounts: 0
    },
    silver: {
      pointsMultiplier: 1.25,
      freeShippingThreshold: 75,
      earlyAccess: true,
      specialDiscounts: 5
    },
    gold: {
      pointsMultiplier: 1.5,
      freeShippingThreshold: 50,
      earlyAccess: true,
      specialDiscounts: 10
    },
    platinum: {
      pointsMultiplier: 2,
      freeShippingThreshold: 0,
      earlyAccess: true,
      specialDiscounts: 15
    }
  };

  return benefits[tier as keyof typeof benefits] || benefits.bronze;
};