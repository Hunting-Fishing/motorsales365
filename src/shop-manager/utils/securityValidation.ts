import { z } from 'zod';

/**
 * Security validation utilities
 */

// Email validation schema
export const emailSchema = z.string().email('Invalid email format');

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// URL validation schema
export const urlSchema = z.string().url('Invalid URL format');

// Phone validation schema
export const phoneSchema = z.string().regex(
  /^[\+]?[(]?[\d\s\-\(\)]{10,}$/,
  'Invalid phone number format'
);

// Text input validation (no HTML)
export const safeTextSchema = z.string()
  .max(5000, 'Text too long')
  .refine(
    (val) => !/<[^>]*>/g.test(val),
    'HTML tags are not allowed'
  );

/**
 * Validates and sanitizes user input
 */
export function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => e.message).join(', ') 
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Rate limiting helper using browser storage
 */
export class ClientRateLimit {
  private static getKey(action: string): string {
    return `rate_limit_${action}`;
  }

  static check(action: string, maxAttempts: number, windowMinutes: number): boolean {
    try {
      const key = this.getKey(action);
      const stored = localStorage.getItem(key);
      
      if (!stored) return false;
      
      const data = JSON.parse(stored);
      const now = Date.now();
      const windowMs = windowMinutes * 60 * 1000;
      
      // Check if we're still in the same window
      if (now - data.windowStart < windowMs) {
        return data.attempts >= maxAttempts;
      }
      
      // Window expired, remove old data
      localStorage.removeItem(key);
      return false;
    } catch {
      return false;
    }
  }

  static record(action: string, windowMinutes: number): void {
    try {
      const key = this.getKey(action);
      const stored = localStorage.getItem(key);
      const now = Date.now();
      const windowMs = windowMinutes * 60 * 1000;
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // If still in same window, increment
        if (now - data.windowStart < windowMs) {
          data.attempts += 1;
          localStorage.setItem(key, JSON.stringify(data));
          return;
        }
      }
      
      // New window or no existing data
      localStorage.setItem(key, JSON.stringify({
        windowStart: now,
        attempts: 1
      }));
    } catch {
      // Ignore storage errors
    }
  }

  static reset(action: string): void {
    try {
      const key = this.getKey(action);
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
}