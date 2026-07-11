import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceActivity {
  id: string;
  shop_id: string;
  schedule_id?: string;
  equipment_id?: string;
  action: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  details?: any;
  flagged: boolean;
  flag_reason?: string;
}

/**
 * Records a maintenance activity
 */
export const recordMaintenanceActivity = async (
  action: string,
  shopId: string,
  userId: string,
  userName: string,
  scheduleId?: string,
  equipmentId?: string,
  details?: any
): Promise<void> => {
  try {
    await supabase
      .from('maintenance_activities')
      .insert({
        shop_id: shopId,
        schedule_id: scheduleId,
        equipment_id: equipmentId,
        action: action,
        user_id: userId,
        user_name: userName,
        details: details,
      });
  } catch (error) {
    console.error(`Error recording ${action} maintenance activity:`, error);
  }
};

/**
 * Gets all maintenance activities for a shop
 */
export const getMaintenanceActivities = async (shopId: string) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_activities')
      .select('*')
      .eq('shop_id', shopId)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching maintenance activities:', error);
    return [];
  }
};

/**
 * Gets activities for a specific maintenance schedule
 */
export const getScheduleActivities = async (scheduleId: string) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_activities')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching schedule activities:', error);
    return [];
  }
};

/**
 * Flag a maintenance activity for review
 */
export const flagMaintenanceActivity = async (activityId: string, reason: string) => {
  try {
    const { error } = await supabase
      .from('maintenance_activities')
      .update({
        flagged: true,
        flag_reason: reason
      })
      .eq('id', activityId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error flagging maintenance activity:', error);
    return false;
  }
};
