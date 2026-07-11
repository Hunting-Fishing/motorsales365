import { supabase } from '@/integrations/supabase/client';
import { ClientRateLimit } from '@/utils/securityValidation';

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  rateLimitWindowMinutes: number;
}

export class AuthSecurityService {
  private static config: SecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    rateLimitWindowMinutes: 15,
  };

  /**
   * Check if user is rate limited for login attempts
   */
  static isLoginRateLimited(email: string): boolean {
    return ClientRateLimit.check(
      `login_${email}`,
      this.config.maxLoginAttempts,
      this.config.rateLimitWindowMinutes
    );
  }

  /**
   * Record a login attempt
   */
  static recordLoginAttempt(email: string): void {
    ClientRateLimit.record(
      `login_${email}`,
      this.config.rateLimitWindowMinutes
    );
  }

  /**
   * Reset login attempts after successful login
   */
  static resetLoginAttempts(email: string): void {
    ClientRateLimit.reset(`login_${email}`);
  }

  /**
   * Validate role assignment permissions
   */
  static async validateRoleAssignment(
    assignedByUserId: string,
    targetRole: string
  ): Promise<boolean> {
    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          role:roles(name)
        `)
        .eq('user_id', assignedByUserId);

      if (error || !userRoles) return false;

      const currentUserRoles = userRoles.map((ur: any) => ur.role.name);
      
      // Only owners can assign roles
      const canAssignRoles = currentUserRoles.includes('owner');
      
      // Additional validation: prevent privilege escalation
      if (targetRole === 'owner' && !currentUserRoles.includes('owner')) {
        return false;
      }

      return canAssignRoles;
    } catch (error) {
      console.error('Role validation error:', error);
      return false;
    }
  }

  /**
   * Log security events for monitoring
   */
  static async logSecurityEvent(
    eventType: 'login_attempt' | 'role_change' | 'permission_denied' | 'suspicious_activity',
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action: eventType,
          resource: 'auth_security',
          details,
          ip_address: details.ip || 'unknown',
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Check for suspicious login patterns
   */
  static detectSuspiciousActivity(
    email: string,
    ipAddress?: string
  ): boolean {
    // Check for rapid login attempts from different IPs
    const recentAttempts = localStorage.getItem(`recent_attempts_${email}`);
    if (recentAttempts) {
      const attempts = JSON.parse(recentAttempts);
      const now = Date.now();
      const recentCount = attempts.filter(
        (attempt: any) => now - attempt.timestamp < 300000 // 5 minutes
      ).length;
      
      return recentCount > 3;
    }
    
    return false;
  }

  /**
   * Enhanced login with security checks
   */
  static async secureLogin(
    email: string,
    password: string,
    ipAddress?: string
  ): Promise<{ success: boolean; error?: string; requiresCaptcha?: boolean }> {
    // Check rate limiting
    if (this.isLoginRateLimited(email)) {
      await this.logSecurityEvent('login_attempt', {
        email,
        ip: ipAddress,
        status: 'rate_limited',
      });
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.',
      };
    }

    // Check for suspicious activity
    if (this.detectSuspiciousActivity(email, ipAddress)) {
      await this.logSecurityEvent('suspicious_activity', {
        email,
        ip: ipAddress,
        type: 'rapid_login_attempts',
      });
      return {
        success: false,
        error: 'Suspicious activity detected. Please contact support.',
        requiresCaptcha: true,
      };
    }

    // Record login attempt
    this.recordLoginAttempt(email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        await this.logSecurityEvent('login_attempt', {
          email,
          ip: ipAddress,
          status: 'failed',
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      // Success - reset rate limiting
      this.resetLoginAttempts(email);
      
      await this.logSecurityEvent('login_attempt', {
        email,
        ip: ipAddress,
        status: 'success',
        user_id: data.user?.id,
      });

      return { success: true };
    } catch (error) {
      await this.logSecurityEvent('login_attempt', {
        email,
        ip: ipAddress,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      };
    }
  }
}