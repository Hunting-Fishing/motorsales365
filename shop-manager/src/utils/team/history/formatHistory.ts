
import { format, formatDistanceToNow } from "date-fns";
import { TeamMemberHistoryRecord } from "./types";

/**
 * Formats a history record for display
 */
export const formatHistoryRecord = (record: TeamMemberHistoryRecord): string => {
  const date = new Date(record.timestamp);
  const formattedDate = format(date, "PPP");
  const relativeDate = formatDistanceToNow(date, { addSuffix: true });
  
  let actionLabel = "";
  
  switch (record.action_type) {
    case "role_change":
      const previousRole = record.details.previous_role || record.details.from || "none";
      const newRole = record.details.new_role || record.details.to;
      actionLabel = `Role changed from "${previousRole}" to "${newRole}"`;
      break;
    case "status_change":
      actionLabel = `Status changed from "${record.details.previous_status || 'Active'}" to "${record.details.new_status}"`;
      break;
    case "creation":
      actionLabel = "Team member was added";
      break;
    case "deletion":
      actionLabel = "Team member was removed";
      break;
    case "update":
      const fields = record.details.fields;
      actionLabel = fields 
        ? `Updated fields: ${Array.isArray(fields) ? fields.join(', ') : fields}`
        : "Profile was updated";
      break;
    case "navigation_access_granted":
      const grantedSections = record.details.sections_granted || [];
      actionLabel = grantedSections.length > 0
        ? `Granted navigation access to: ${grantedSections.join(', ')}`
        : "Granted special navigation access";
      break;
    case "navigation_access_revoked":
      const revokedSections = record.details.sections_revoked || [];
      actionLabel = revokedSections.length > 0
        ? `Revoked navigation access to: ${revokedSections.join(', ')}`
        : "Revoked special navigation access";
      break;
    case "navigation_access_reset":
      actionLabel = "Reset all special navigation access to role defaults";
      break;
    default:
      actionLabel = `${record.action_type.replace("_", " ")}`;
  }
  
  return `${actionLabel} ${relativeDate} by ${record.action_by_name || "System"}`;
};
