
import { supabase } from "@/lib/supabase";

export interface TodayScheduleItem {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  event_type: string;
  status: string;
}

export const getTodaySchedule = async (): Promise<TodayScheduleItem[]> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching today's schedule:", error);
    return [];
  }
};
