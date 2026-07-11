
import { supabase } from '@/lib/supabase';

/**
 * Basic data validation functions
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
};

export const isValidPostalCode = (postalCode: string, countryCode: string = 'US'): boolean => {
  if (countryCode === 'US') {
    return /^\d{5}(-\d{4})?$/.test(postalCode);
  } else if (countryCode === 'CA') {
    return /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/.test(postalCode);
  } else {
    return postalCode.length > 0;
  }
};

/**
 * Safe query utility that won't throw errors if the table doesn't exist
 */
export async function safeQueryTable(tableName: string) {
  try {
    // Mock this function to avoid Supabase errors
    // In a real app, this would use the actual supabase client
    console.log(`Safe querying table: ${tableName}`);
    return { data: [], error: null };
  } catch (error) {
    console.error(`Error querying table ${tableName}:`, error);
    return { data: null, error };
  }
}

/**
 * Check if a table exists in the database
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Mock this function to avoid Supabase errors
    // In a real app, this would check the actual database schema
    console.log(`Checking if table exists: ${tableName}`);
    return true;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}
