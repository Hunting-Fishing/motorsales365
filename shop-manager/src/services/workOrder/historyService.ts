
import { supabase } from '@/integrations/supabase/client';

export interface HistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string;
  change_reason: string | null;
  changed_at: string;
}

export async function getJobLineHistory(jobLineId: string): Promise<HistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('work_order_job_line_history')
      .select('*')
      .eq('job_line_id', jobLineId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching job line history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getJobLineHistory:', error);
    throw error;
  }
}

export async function getPartHistory(partId: string): Promise<HistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('work_order_part_history')
      .select('*')
      .eq('part_id', partId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching part history:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPartHistory:', error);
    throw error;
  }
}

export async function recordJobLineStatusChange(
  jobLineId: string,
  oldStatus: string,
  newStatus: string,
  changedByName: string,
  changeReason?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('work_order_job_line_history')
      .insert({
        job_line_id: jobLineId,
        field_name: 'status',
        old_value: oldStatus,
        new_value: newStatus,
        changed_by_name: changedByName,
        change_reason: changeReason
      });

    if (error) {
      console.error('Error recording job line status change:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in recordJobLineStatusChange:', error);
    throw error;
  }
}

export async function recordPartStatusChange(
  partId: string,
  oldStatus: string,
  newStatus: string,
  changedByName: string,
  changeReason?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('work_order_part_history')
      .insert({
        part_id: partId,
        field_name: 'status',
        old_value: oldStatus,
        new_value: newStatus,
        changed_by_name: changedByName,
        change_reason: changeReason
      });

    if (error) {
      console.error('Error recording part status change:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in recordPartStatusChange:', error);
    throw error;
  }
}
