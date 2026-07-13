
import { supabase } from "@/lib/supabase";
import { TeamMemberHistoryRecord } from "./types";

/**
 * Fetches history records for a team member
 * @param profileId The profile ID to fetch history for
 * @param limit Maximum number of records to return
 * @param offset Pagination offset
 * @returns Array of history records
 */
export const fetchTeamMemberHistory = async (
  profileId: string,
  limit = 20,
  offset = 0
): Promise<TeamMemberHistoryRecord[]> => {
  try {
    const { data, error } = await supabase
      .from("team_member_history")
      .select("*")
      .eq("profile_id", profileId)
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching team member history:", error);
      return [];
    }

    return data as TeamMemberHistoryRecord[];
  } catch (error) {
    console.error("Exception fetching team member history:", error);
    return [];
  }
};

/**
 * Fetches all team member history records
 * @param limit Maximum number of records to return
 * @param offset Pagination offset
 * @returns Array of history records
 */
export const fetchAllTeamHistory = async (
  limit = 100,
  offset = 0
): Promise<TeamMemberHistoryRecord[]> => {
  try {
    const { data, error } = await supabase
      .from("team_member_history")
      .select("*")
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching all team history:", error);
      return [];
    }

    return data as TeamMemberHistoryRecord[];
  } catch (error) {
    console.error("Exception fetching all team history:", error);
    return [];
  }
};
