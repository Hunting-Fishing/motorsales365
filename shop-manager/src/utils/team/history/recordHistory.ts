
import { supabase } from "@/lib/supabase";
import { RecordTeamMemberHistoryData } from "./types";

/**
 * Records an action in the team member history
 * @param data History record data
 * @returns The created history record ID
 */
export const recordTeamMemberHistory = async (
  data: RecordTeamMemberHistoryData
): Promise<string | null> => {
  try {
    // Use the new record_team_history database function
    const { data: record, error } = await supabase
      .rpc('record_team_history', {
        profile_id_param: data.profile_id,
        action_type_param: data.action_type,
        action_by_param: data.action_by,
        action_by_name_param: data.action_by_name || 'System',
        details_param: data.details || {}
      })
      .single();

    if (error) {
      console.error("Error recording team member history:", error);
      return null;
    }

    return record as string;
  } catch (error) {
    console.error("Exception recording team member history:", error);
    return null;
  }
};
