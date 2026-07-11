/**
 * Utility functions for handling duplicate names in team member lists
 */

interface TeamMemberBase {
  id: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  department?: string;
  job_title?: string;
}

interface DisplayNameResult {
  displayName: string;
  isDuplicate: boolean;
  disambiguator?: string;
}

/**
 * Detects duplicate names and generates unique display names with disambiguators
 * @param members Array of team members to check for duplicates
 * @returns Map of member IDs to their display information
 */
export function generateUniqueDisplayNames<T extends TeamMemberBase>(
  members: T[]
): Map<string, DisplayNameResult> {
  const displayMap = new Map<string, DisplayNameResult>();
  const nameCountMap = new Map<string, T[]>();

  // Group members by full name
  members.forEach(member => {
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
    if (!nameCountMap.has(fullName)) {
      nameCountMap.set(fullName, []);
    }
    nameCountMap.get(fullName)!.push(member);
  });

  // Process each group
  nameCountMap.forEach((groupMembers, fullName) => {
    if (groupMembers.length === 1) {
      // No duplicates - use the name as-is
      displayMap.set(groupMembers[0].id, {
        displayName: fullName || 'Unknown User',
        isDuplicate: false
      });
    } else {
      // Handle duplicates - add disambiguating information
      groupMembers.forEach((member, index) => {
        const disambiguators: string[] = [];

        // Try middle initial first (most relevant for name disambiguation)
        if (member.middle_name && member.middle_name.length > 0) {
          disambiguators.push(member.middle_name.charAt(0).toUpperCase() + '.');
        }

        // Try email username (unique identifier)
        if (member.email) {
          const emailUsername = member.email.split('@')[0];
          disambiguators.push(emailUsername);
        }

        // Try department if available
        if (member.department && member.department !== 'Unknown') {
          disambiguators.push(member.department);
        }

        // Try job title if available
        if (member.job_title && member.job_title !== 'Unknown') {
          disambiguators.push(member.job_title);
        }

        // Fallback to index number if no other distinguisher
        if (disambiguators.length === 0) {
          disambiguators.push(`#${index + 1}`);
        }

        const disambiguator = disambiguators[0]; // Use the first (most relevant) disambiguator

        displayMap.set(member.id, {
          displayName: fullName || 'Unknown User',
          isDuplicate: true,
          disambiguator: disambiguator
        });
      });
    }
  });

  return displayMap;
}

/**
 * Formats a display name with its disambiguator
 * @param displayInfo Display information from generateUniqueDisplayNames
 * @returns Formatted display string
 */
export function formatDisplayName(displayInfo: DisplayNameResult): string {
  if (!displayInfo.isDuplicate || !displayInfo.disambiguator) {
    return displayInfo.displayName;
  }
  return `${displayInfo.displayName} (${displayInfo.disambiguator})`;
}

/**
 * Gets just the disambiguator for badge/chip display
 * @param displayInfo Display information from generateUniqueDisplayNames
 * @returns The disambiguator string or null
 */
export function getDisambiguator(displayInfo: DisplayNameResult): string | null {
  return displayInfo.isDuplicate ? displayInfo.disambiguator || null : null;
}
