import { recordTeamMemberHistory } from './recordHistory';

interface NavigationAccessLogData {
  targetUserId: string;        // User receiving access
  targetUserName: string;      // Name of user receiving access
  grantedBy: string;           // Manager/Owner granting access
  grantedByName: string;       // Name of person granting
  sectionsGranted?: string[];  // Sections added
  sectionsRevoked?: string[];  // Sections removed
  action: 'granted' | 'revoked' | 'reset';
}

/**
 * Log navigation access changes to team member history
 * Records when special navigation access is granted, revoked, or reset
 */
export async function logNavigationAccessChange(data: NavigationAccessLogData): Promise<string | null> {
  try {
    const actionType = `navigation_access_${data.action}`;
    
    const details = {
      sections_granted: data.sectionsGranted || [],
      sections_revoked: data.sectionsRevoked || [],
      timestamp: new Date().toISOString(),
      target_user_name: data.targetUserName,
      action_description: generateActionDescription(data),
    };

    return await recordTeamMemberHistory({
      profile_id: data.targetUserId,
      action_type: actionType,
      action_by: data.grantedBy,
      action_by_name: data.grantedByName,
      details,
    });
  } catch (error) {
    console.error('Error logging navigation access change:', error);
    return null;
  }
}

/**
 * Generate human-readable description of the navigation access change
 */
function generateActionDescription(data: NavigationAccessLogData): string {
  switch (data.action) {
    case 'granted':
      if (data.sectionsGranted && data.sectionsGranted.length > 0) {
        const sections = data.sectionsGranted.join(', ');
        return `Granted access to: ${sections}`;
      }
      return 'Granted special navigation access';
      
    case 'revoked':
      if (data.sectionsRevoked && data.sectionsRevoked.length > 0) {
        const sections = data.sectionsRevoked.join(', ');
        return `Revoked access to: ${sections}`;
      }
      return 'Revoked special navigation access';
      
    case 'reset':
      return 'Reset all special navigation access to role defaults';
      
    default:
      return 'Navigation access changed';
  }
}
