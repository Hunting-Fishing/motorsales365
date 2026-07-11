
/**
 * Safely parses JSON fields from database responses
 * @param jsonData The JSON data to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed object or default value
 */
export function parseJsonField<T>(jsonData: any, defaultValue: T): T {
  if (!jsonData) return defaultValue;
  
  try {
    if (typeof jsonData === 'string') {
      return JSON.parse(jsonData) as T;
    } else if (typeof jsonData === 'object') {
      return jsonData as T;
    }
  } catch (e) {
    console.error('Error parsing JSON field:', e);
  }
  
  return defaultValue;
}

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
