
import { supabase } from '@/integrations/supabase/client';

// Record technician status change
export const recordTechnicianStatusChange = async (
  technicianId: string,
  technicianName: string,
  previousStatus: string,
  newStatus: string,
  changeReason: string,
  changedByUserId: string,
  changedByUserName: string
) => {
  try {
    // Record in work_order_activities since we don't directly access technician_status_changes
    const { data, error } = await supabase
      .from('work_order_activities')
      .insert({
        work_order_id: '00000000-0000-0000-0000-000000000000', // No specific work order
        action: `Technician status changed: ${technicianName} from ${previousStatus} to ${newStatus}. Reason: ${changeReason}`,
        user_id: changedByUserId,
        user_name: changedByUserName,
        flagged: false
      });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error recording technician status change:', error);
    throw error;
  }
};

// Get all activity for a specific technician
export const getTechnicianActivity = async (technicianId: string) => {
  try {
    const { data, error } = await supabase
      .from('work_order_activities')
      .select('*')
      .eq('user_id', technicianId)
      .order('timestamp', { ascending: false });
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching technician activity:', error);
    throw error;
  }
};
