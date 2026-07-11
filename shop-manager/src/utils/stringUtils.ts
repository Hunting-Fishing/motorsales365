
/**
 * Capitalize the first letter of a string
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a camelCase string to Title Case with spaces
 * @param str camelCase string to format
 * @returns Title Case string with spaces
 */
export function camelCaseToTitleCase(str: string): string {
  if (!str || typeof str !== 'string') return '';
  
  // Add space before capital letters and uppercase the first letter
  const result = str.replace(/([A-Z])/g, ' $1');
  return capitalize(result);
}

/**
 * Truncates text with ellipsis if it exceeds the specified length
 * @param str Text to truncate
 * @param length Maximum allowed length
 * @returns Truncated string with ellipsis if needed
 */
export function truncateText(str: string, length: number): string {
  if (!str || typeof str !== 'string') return '';
  
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Format a number with proper thousand separators
 * @param num Number to format
 * @param locale Locale to use for formatting
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  if (num === undefined || num === null) return '';
  
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Converts kebab-case to camelCase
 * @param str Kebab case string
 * @returns camelCase string
 */
export function kebabToCamelCase(str: string): string {
  if (!str || typeof str !== 'string') return '';
  
  return str.replace(/-([a-z])/g, function(g) { 
    return g[1].toUpperCase(); 
  });
}
