
import { supabase } from '@/integrations/supabase/client';

/**
 * Clean up authentication state to prevent limbo states
 */
export const cleanupAuthState = () => {
  try {
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    // Clear any auth-related cookies
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach((c) => {
        const cookie = c.trim();
        if (cookie.includes('sb-') || cookie.includes('supabase')) {
          const name = cookie.split('=')[0];
          document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`;
        }
      });
    }
  } catch (error) {
    console.warn('Error cleaning up auth state:', error);
  }
};

/**
 * Perform complete auth recovery - sign out and clean up
 */
export const performAuthRecovery = async () => {
  try {
    // Clean up first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Could not perform global sign out:', err);
    }
    
    // Force redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  } catch (error) {
    console.error('Auth recovery failed:', error);
    // Still redirect even on error
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
};
