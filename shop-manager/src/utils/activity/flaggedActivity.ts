
import { supabase } from '@/integrations/supabase/client';

// Record flagged activity
export const recordFlaggedActivity = async (
  technicianId: string,
  activityId: string,
  activityType: string,
  flagReason: string,
  flaggedByUserId: string,
  flaggedByUserName: string
) => {
  try {
    // Record this as a general activity in work_order_activities
    const { data, error } = await supabase
      .from('work_order_activities')
      .insert({
        work_order_id: '00000000-0000-0000-0000-000000000000', // No specific work order
        action: `Activity flagged for technician ID ${technicianId}, activity ID ${activityId}, type ${activityType}`,
        user_id: flaggedByUserId,
        user_name: flaggedByUserName,
        flagged: true,
        flag_reason: flagReason
      });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error recording flagged activity:', error);
    throw error;
  }
};

// Get all flagged activities (Using work_order_activities table with flagged=true)
export const getFlaggedActivities = async (resolved: boolean = false) => {
  try {
    const { data, error } = await supabase
      .from('work_order_activities')
      .select('*')
      .eq('flagged', true)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching flagged activities:', error);
    throw error;
  }
};

// Resolve a flagged activity (Updated to use work_order_activities)
export const resolveFlaggedActivity = async (
  flaggedActivityId: string,
  resolutionNotes: string,
  resolvedByUserId: string,
  resolvedByUserName: string
) => {
  try {
    // First, find the flagged activity to mark as resolved
    const { data: activityToResolve, error: findError } = await supabase
      .from('work_order_activities')
      .select('*')
      .eq('id', flaggedActivityId)
      .single();
    
    if (findError) throw findError;
    
    // Create a new activity to record the resolution
    const { data, error: activityError } = await supabase
      .from('work_order_activities')
      .insert({
        work_order_id: activityToResolve.work_order_id || '00000000-0000-0000-0000-000000000000',
        action: `Resolved flagged activity ID ${flaggedActivityId}. Notes: ${resolutionNotes}`,
        user_id: resolvedByUserId,
        user_name: resolvedByUserName,
        flagged: false
      });

    if (activityError) throw activityError;
    
    return data;
  } catch (error) {
    console.error('Error resolving flagged activity:', error);
    throw error;
  }
};
