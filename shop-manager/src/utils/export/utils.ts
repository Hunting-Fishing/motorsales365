
/**
 * Get formatted date string for file naming
 */
export const getFormattedDate = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0].replace(/-/g, '');
};

/**
 * Format date for display
 */
export const formatDisplayDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
};

/**
 * Format date and time for display
 */
export const formatDisplayDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString();
};
