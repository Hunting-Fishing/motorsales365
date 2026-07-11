import { supabase } from '@/lib/supabase';

/**
 * Generic response interface for service methods
 */
export interface GenericResponse<T> {
  data: T | null;
  error: any;
}

/**
 * Utility function for custom table queries
 * @param tableName Table name to query
 * @param query Query builder function
 * @returns Response with data or error
 */
export const customTableQuery = async <T>(
  tableName: string,
  queryCallback: (supabaseClient: typeof supabase) => any
): Promise<GenericResponse<T>> => {
  try {
    const query = queryCallback(supabase);
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error querying ${tableName}:`, error);
      return { data: null, error };
    }
    
    return { data: data as T, error: null };
  } catch (error) {
    console.error(`Exception querying ${tableName}:`, error);
    return { data: null, error };
  }
};

/**
 * Utility function to parse JSON fields from database responses
 */
export const parseJsonField = <T>(field: any, defaultValue: T): T => {
  try {
    if (field === null || field === undefined) return defaultValue;
    
    // If it's already an object and not an array, return it
    if (typeof field === 'object' && !Array.isArray(field)) return field as T;
    
    // If it's already an array and we expect an array, return it
    if (Array.isArray(field) && Array.isArray(defaultValue)) return field as T;
    
    // Otherwise, try to parse it as JSON
    const fieldStr = typeof field === 'string' ? field : JSON.stringify(field);
    return JSON.parse(fieldStr) as T;
  } catch (e) {
    console.error("Error parsing JSON field:", e);
    return defaultValue;
  }
};

/**
 * Helper function to safely convert database types to application types
 */
export const safelyParseEnum = <T extends string>(value: string, fallback: T): T => {
  return value as T || fallback;
};

/**
 * Helper function to convert complex objects to JSON for storage
 */
export const prepareForSupabase = (object: any): any => {
  return JSON.parse(JSON.stringify(object));
};
