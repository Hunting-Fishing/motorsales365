import { supabase } from '@/integrations/supabase/client';

export interface SecuritySetting {
  id: string;
  name: string;
  description: string;
  value: boolean | string | number;
  category: 'authentication' | 'authorization' | 'encryption' | 'audit' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityAuditLog {
  id: string;
  action: string;
  user_id: string;
  resource: string;
  timestamp: string;
  ip_address: string;
  details: any;
  risk_level: 'low' | 'medium' | 'high';
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: string;
  created_at: string;
  resolved: boolean;
}

class SecurityService {
  async getSecuritySettings(): Promise<SecuritySetting[]> {
    // Mock security settings - in real app these would come from a security_settings table
    return [
      {
        id: '1',
        name: 'Session Timeout',
        description: 'Automatic session timeout in minutes',
        value: 30,
        category: 'authentication',
        severity: 'medium',
      },
      {
        id: '2',
        name: 'Two-Factor Authentication',
        description: 'Require 2FA for all users',
        value: true,
        category: 'authentication',
        severity: 'high',
      },
      {
        id: '3',
        name: 'Password Complexity',
        description: 'Enforce strong password requirements',
        value: true,
        category: 'authentication',
        severity: 'high',
      },
      {
        id: '4',
        name: 'Data Encryption',
        description: 'Encrypt sensitive data at rest',
        value: true,
        category: 'encryption',
        severity: 'critical',
      },
      {
        id: '5',
        name: 'Audit Logging',
        description: 'Log all user actions',
        value: true,
        category: 'audit',
        severity: 'medium',
      },
    ];
  }

  async updateSecuritySetting(id: string, value: boolean | string | number): Promise<void> {
    // In real app, this would update the security_settings table
    console.log(`Updating security setting ${id} to ${value}`);
  }

  async getSecurityAuditLogs(): Promise<SecurityAuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return data?.map(log => ({
      id: log.id,
      action: log.action,
      user_id: log.user_id || 'unknown',
      resource: log.resource,
      timestamp: log.created_at,
      ip_address: log.ip_address || 'unknown',
      details: log.details,
      risk_level: this.calculateRiskLevel(log.action),
    })) || [];
  }

  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    const { data, error } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data?.map(alert => ({
      id: alert.id,
      title: alert.rule_name,
      description: alert.description || 'Security alert triggered',
      severity: alert.alert_severity as SecurityAlert['severity'],
      category: alert.rule_type,
      created_at: alert.created_at,
      resolved: false,
    })) || [];
  }

  private calculateRiskLevel(action: string): 'low' | 'medium' | 'high' {
    const highRiskActions = ['delete', 'unauthorized_access', 'failed_login'];
    const mediumRiskActions = ['update', 'create', 'export'];
    
    if (highRiskActions.some(risk => action.toLowerCase().includes(risk))) {
      return 'high';
    }
    if (mediumRiskActions.some(risk => action.toLowerCase().includes(risk))) {
      return 'medium';
    }
    return 'low';
  }

  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('alert_rules')
      .update({ is_active: false })
      .eq('id', alertId);

    if (error) throw error;
  }
}

export const securityService = new SecurityService();