import { supabase } from "@/integrations/supabase/client";
import { TimeEntry } from "@/types/workOrder";

/**
 * Get time entries for a work order and/or specific job line
 */
export const getWorkOrderTimeEntries = async (
  workOrderId: string,
  jobLineId?: string
): Promise<any[]> => { // Stay as any[] to avoid TS recursion problems
  try {
    // Build query dynamically to avoid type inference issues
    let queryString = `*`;
    const filters: any = { work_order_id: workOrderId };
    
    if (jobLineId) {
      filters.job_line_id = jobLineId;
    }

    // Use direct from().select() approach without chaining to avoid type inference
    const { data, error } = await supabase
      .from('work_order_time_entries')
      .select(queryString)
      .match(filters)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching work order time entries:', error);
    return [];
  }
};

/**
 * Add time entry to work order
 */
export const addTimeEntryToWorkOrder = async (
  workOrderId: string,
  timeEntry: Omit<TimeEntry, 'id' | 'work_order_id' | 'created_at'> & { job_line_id?: string }
): Promise<TimeEntry | null> => {
  try {
    const { data, error } = await supabase
      .from('work_order_time_entries')
      .insert({
        work_order_id: workOrderId,
        job_line_id: timeEntry.job_line_id,
        employee_id: timeEntry.employee_id,
        employee_name: timeEntry.employee_name,
        start_time: timeEntry.start_time,
        end_time: timeEntry.end_time,
        duration: timeEntry.duration,
        billable: timeEntry.billable,
        notes: timeEntry.notes
      })
      .select();
      
    if (error) throw error;
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Error adding time entry to work order:', error);
    return null;
  }
};

/**
 * Update time entry
 */
export const updateTimeEntry = async (
  entryId: string,
  updates: Partial<TimeEntry>
): Promise<TimeEntry | null> => {
  try {
    const { data, error } = await supabase
      .from('work_order_time_entries')
      .update(updates)
      .eq('id', entryId)
      .select();
      
    if (error) throw error;
    
    return data?.[0] || null;
  } catch (error) {
    console.error('Error updating time entry:', error);
    return null;
  }
};

/**
 * Delete time entry
 */
export const deleteTimeEntry = async (entryId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('work_order_time_entries')
      .delete()
      .eq('id', entryId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return false;
  }
};
