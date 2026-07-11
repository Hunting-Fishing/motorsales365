
/**
 * Utility functions for team member management
 */

/**
 * Returns the initials for a given name
 * @param name Full name to extract initials from
 */
export const getInitials = (name: string) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};
