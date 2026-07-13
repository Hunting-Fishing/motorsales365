
import { supabase } from "@/lib/supabase";
import { ShiftChat } from "@/types/calendar";

/**
 * Get shift chats for a date range
 */
export async function getShiftChats(startDate: string, endDate: string): Promise<ShiftChat[]> {
  try {
    const { data, error } = await supabase
      .from('shift_chats')
      .select(`
        id,
        chat_room_id,
        shift_date,
        start_time,
        end_time,
        shift_name,
        created_by,
        created_at,
        updated_at,
        technician_ids
      `)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching shift chats:", error);
    return [];
  }
}
