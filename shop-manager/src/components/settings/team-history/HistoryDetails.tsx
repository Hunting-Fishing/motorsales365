
import React from "react";
import { TeamMemberHistoryRecord } from "@/utils/team/history";

interface HistoryDetailsProps {
  record: TeamMemberHistoryRecord;
}

export const HistoryDetails = ({ record }: HistoryDetailsProps) => {
  const getActionDetails = (record: TeamMemberHistoryRecord) => {
    switch(record.action_type) {
      case 'role_change':
        const previousRole = record.details.previous_role || record.details.from || 'None';
        const newRole = record.details.new_role || record.details.to;
        return `Changed from "${previousRole}" to "${newRole}"`;
      case 'status_change':
        return `Changed from "${record.details.previous_status || 'Active'}" to "${record.details.new_status}"`;
      case 'update':
        return record.details.fields ? 
          `Updated fields: ${Array.isArray(record.details.fields) ? record.details.fields.join(', ') : record.details.fields}` : 
          'Profile updated';
      case 'creation':
        return 'Team member added';
      case 'deletion':
        return 'Team member removed';
      default:
        return JSON.stringify(record.details);
    }
  };

  return (
    <span className="max-w-xs truncate">{getActionDetails(record)}</span>
  );
};
