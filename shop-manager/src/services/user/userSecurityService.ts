import { supabase } from "@/integrations/supabase/client";

export interface UserSession {
  id: string;
  device_name: string | null;
  browser_name: string | null;
  operating_system: string | null;
  ip_address: unknown;
  location: string | null;
  user_agent: string | null;
  is_current: boolean;
  last_active: string;
  expires_at: string | null;
  created_at: string;
  session_token: string;
  user_id: string;
  updated_at: string;
}

export interface User2FA {
  id: string;
  user_id: string;
  secret: string;
  enabled: boolean;
  backup_codes: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityAuditLog {
  id: string;
  action: string;
  user_id: string | null;
  resource: string;
  timestamp: string;
  ip_address: string | null;
  details: any;
}

export const userSecurityService = {
  // Session Management
  async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_active", { ascending: false });

      if (error) {
        console.error("Error fetching user sessions:", error);
        return [];
      }

      return (data || []).map(session => ({
        ...session,
        ip_address: session.ip_address?.toString() || null
      }));
    } catch (error) {
      console.error("Failed to fetch user sessions:", error);
      return [];
    }
  },

  async createUserSession(sessionData: Partial<UserSession> & { user_id: string; session_token: string }): Promise<UserSession | null> {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error("Error creating user session:", error);
        return null;
      }

      return {
        ...data,
        ip_address: data.ip_address?.toString() || null
      };
    } catch (error) {
      console.error("Failed to create user session:", error);
      return null;
    }
  },

  async terminateSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) {
        console.error("Error terminating session:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to terminate session:", error);
      return false;
    }
  },

  async terminateAllOtherSessions(userId: string, currentSessionId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from("user_sessions")
        .delete()
        .eq("user_id", userId);

      if (currentSessionId) {
        query = query.neq("id", currentSessionId);
      }

      const { error } = await query;

      if (error) {
        console.error("Error terminating other sessions:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to terminate other sessions:", error);
      return false;
    }
  },

  // 2FA Management
  async get2FAStatus(userId: string): Promise<User2FA | null> {
    try {
      const { data, error } = await supabase
        .from("user_2fa")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error("Error fetching 2FA status:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to fetch 2FA status:", error);
      return null;
    }
  },

  async enable2FA(userId: string, secret: string): Promise<User2FA | null> {
    try {
      const { data, error } = await supabase
        .from("user_2fa")
        .upsert({
          user_id: userId,
          secret: secret,
          enabled: true,
          backup_codes: this.generateBackupCodes()
        })
        .select()
        .single();

      if (error) {
        console.error("Error enabling 2FA:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Failed to enable 2FA:", error);
      return null;
    }
  },

  async disable2FA(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_2fa")
        .update({ enabled: false })
        .eq("user_id", userId);

      if (error) {
        console.error("Error disabling 2FA:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to disable 2FA:", error);
      return false;
    }
  },

  // Password Management
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Log password change
      await this.logSecurityEvent('password_changed', 'auth.users', {
        action: 'Password changed by user'
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to change password' };
    }
  },

  // Security Audit Logs
  async getSecurityAuditLogs(userId: string, limit = 50): Promise<SecurityAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching audit logs:", error);
        return [];
      }

      return data?.map(log => ({
        id: log.id,
        action: log.action,
        user_id: log.user_id,
        resource: log.resource,
        timestamp: log.created_at,
        ip_address: log.ip_address,
        details: log.details
      })) || [];
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
      return [];
    }
  },

  async logSecurityEvent(action: string, resource: string, details: any = {}): Promise<void> {
    try {
      const { error } = await supabase
        .from("audit_logs")
        .insert({
          action,
          resource,
          details,
          ip_address: await this.getCurrentIpAddress()
        });

      if (error) {
        console.error("Error logging security event:", error);
      }
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  },

  // Account Management
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      // Log account deletion attempt
      await this.logSecurityEvent('account_deletion_requested', 'auth.users', {
        action: 'User requested account deletion',
        user_id: user.id
      });

      // Soft delete: Mark user profile as deleted and deactivate
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deactivating profile:', profileError);
      }

      // Sign out the user
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        return { success: false, error: signOutError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete account:', error);
      return { success: false, error: 'Failed to delete account. Please contact support.' };
    }
  },

  // Helper functions
  generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  },

  async getCurrentIpAddress(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  },

  getDeviceInfo(): { device_name: string; browser_name: string; operating_system: string } {
    const userAgent = navigator.userAgent;
    
    // Simple device detection
    let device_name = 'Unknown Device';
    let browser_name = 'Unknown Browser';
    let operating_system = 'Unknown OS';

    // Operating System detection
    if (userAgent.includes('Windows')) operating_system = 'Windows';
    else if (userAgent.includes('Mac')) operating_system = 'macOS';
    else if (userAgent.includes('Linux')) operating_system = 'Linux';
    else if (userAgent.includes('Android')) operating_system = 'Android';
    else if (userAgent.includes('iOS')) operating_system = 'iOS';

    // Browser detection
    if (userAgent.includes('Chrome')) browser_name = 'Chrome';
    else if (userAgent.includes('Firefox')) browser_name = 'Firefox';
    else if (userAgent.includes('Safari')) browser_name = 'Safari';
    else if (userAgent.includes('Edge')) browser_name = 'Edge';

    // Device name (simplified)
    if (userAgent.includes('Mobile')) device_name = `Mobile ${operating_system}`;
    else device_name = `Desktop ${operating_system}`;

    return { device_name, browser_name, operating_system };
  }
};