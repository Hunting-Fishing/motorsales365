
export interface RecordTeamMemberHistoryData {
  profile_id: string;
  action_type: string; // e.g., "role_change", "status_change", "creation", "deletion", "update"
  action_by: string;
  action_by_name?: string;
  details: any; // Details specific to the action type
}

export interface TeamMemberHistoryRecord {
  id: string;
  profile_id: string;
  action_type: string;
  action_by: string;
  action_by_name?: string;
  timestamp: string;
  details: any;
}
