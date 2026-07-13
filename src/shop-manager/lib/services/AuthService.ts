import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';
import { AuthSecurityService } from '@/services/security/authSecurity';

export interface SignUpData {
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  error: Error | null;
  data?: any;
}

export class AuthService {
  /**
   * Sign in with email and password (with enhanced security)
   */
  static async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      // Clean up any existing auth state
      cleanupAuthState();

      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.warn('Could not perform global sign out:', err);
      }

      // Use enhanced security login
      const securityResult = await AuthSecurityService.secureLogin(
        email,
        password,
        // Note: Getting real IP would require server-side implementation
        'browser'
      );

      if (!securityResult.success) {
        return { 
          error: new Error(securityResult.error || 'Login failed'),
          data: securityResult.requiresCaptcha ? { requiresCaptcha: true } : undefined
        };
      }

      // If we get here, login was successful
      // Return success - let the caller handle navigation
      return { error: null, data: { success: true } };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        error: error instanceof Error ? error : new Error('Sign in failed') 
      };
    }
  }

  /**
   * Sign up with email, password and profile data
   */
  static async signUp(
    email: string, 
    password: string, 
    profileData: SignUpData
  ): Promise<AuthResponse> {
    try {
      // Clean up any existing auth state
      cleanupAuthState();

      const redirectUrl = `${window.location.origin}/dashboard`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: profileData.firstName.trim(),
            last_name: profileData.lastName.trim(),
            full_name: `${profileData.firstName.trim()} ${profileData.lastName.trim()}`
          }
        }
      });

      if (error) {
        return { error };
      }

      return { error: null, data };
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        error: error instanceof Error ? error : new Error('Sign up failed') 
      };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<AuthResponse> {
    try {
      // Clean up auth state first
      cleanupAuthState();

      // Attempt global sign out and wait for completion
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.warn('Sign out error:', error);
      }

      // Verify session is actually cleared
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.warn('Session still exists after signOut, forcing cleanup');
        cleanupAuthState();
      }

      // Use replace for hard navigation with logout flag to prevent auto-redirect
      window.location.replace('/login?logout=true');

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      // Clean up and redirect even on error
      cleanupAuthState();
      window.location.replace('/login?logout=true');
      
      return { 
        error: error instanceof Error ? error : new Error('Sign out failed') 
      };
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      return { error };
    } catch (error) {
      console.error('Password reset error:', error);
      return { 
        error: error instanceof Error ? error : new Error('Password reset failed') 
      };
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      return { error };
    } catch (error) {
      console.error('Password update error:', error);
      return { 
        error: error instanceof Error ? error : new Error('Password update failed') 
      };
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return { session, error };
    } catch (error) {
      console.error('Get session error:', error);
      return { 
        session: null, 
        error: error instanceof Error ? error : new Error('Failed to get session') 
      };
    }
  }
}
