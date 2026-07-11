
import { supabase } from "@/lib/supabase";

/**
 * Records a customer activity
 * @param action The action performed 
 * @param customerId The ID of the customer
 * @param userId The ID of the user who performed the action
 * @param userName The name of the user who performed the action
 */
export const recordCustomerActivity = async (
  action: string,
  customerId: string,
  userId: string,
  userName: string
): Promise<void> => {
  try {
    await supabase
      .from('customer_activities')
      .insert({
        customer_id: customerId,
        action: action,
        user_id: userId,
        user_name: userName
      });
  } catch (error) {
    console.error(`Error recording ${action} activity for customer:`, error);
  }
};

/**
 * Gets all activities for a specific customer
 * @param customerId The ID of the customer
 */
export const getCustomerActivities = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('customer_activities')
      .select('*')
      .eq('customer_id', customerId)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching customer activities:', error);
    return [];
  }
};
