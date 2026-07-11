
import { supabase } from "@/integrations/supabase/client";

/**
 * Records an activity for a work order
 */
export const recordWorkOrderActivity = async (
  action: string, 
  workOrderId: string, 
  userId: string,
  userName: string
): Promise<void> => {
  try {
    await supabase
      .from('work_order_activities')
      .insert({
        work_order_id: workOrderId,
        action: action,
        user_id: userId,
        user_name: userName
      });
  } catch (error) {
    console.error(`Error recording ${action} activity for work order:`, error);
  }
};

/**
 * Gets all activities for a specific work order
 */
export const getWorkOrderActivities = async (workOrderId: string) => {
  try {
    const { data, error } = await supabase
      .from('work_order_activities')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching work order activities:', error);
    return [];
  }
};

/**
 * Flag a work order activity for review
 */
export const flagWorkOrderActivity = async (activityId: string, reason: string) => {
  try {
    const { error } = await supabase
      .from('work_order_activities')
      .update({
        flagged: true,
        flag_reason: reason
      })
      .eq('id', activityId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error flagging work order activity:', error);
    return false;
  }
};
