import { supabase } from '@/integrations/supabase/client';
import type { 
  Permission, 
  RolePermission, 
  AuditTrail, 
  PerformanceMetric, 
  SecurityEvent, 
  User2FA, 
  ApiToken, 
  BIReport, 
  ReportExecution, 
  SystemSetting,
  EnterpriseStats 
} from '@/types/phase4';

class EnterpriseService {
  // Permissions Management
  async getPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);

    if (error) throw error;
    return data || [];
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .insert({ role_id: roleId, permission_id: permissionId });

    if (error) throw error;
  }

  async revokePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId);

    if (error) throw error;
  }

  // Audit Trail
  async getAuditTrail(limit: number = 100): Promise<AuditTrail[]> {
    const { data, error } = await supabase
      .from('audit_trail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      ip_address: item.ip_address as string | null,
      user_agent: item.user_agent as string | null,
      session_id: item.session_id as string | null
    }));
  }

  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('security_events')
      .insert(event);

    if (error) throw error;
  }

  // Performance Monitoring
  async recordPerformanceMetric(metric: Omit<PerformanceMetric, 'id' | 'recorded_at'>): Promise<void> {
    const { error } = await supabase
      .from('performance_metrics')
      .insert(metric);

    if (error) throw error;
  }

  async getPerformanceMetrics(metricName?: string, hours: number = 24): Promise<PerformanceMetric[]> {
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .gte('recorded_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    if (metricName) {
      query = query.eq('metric_name', metricName);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Security Events
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      severity: item.severity as 'low' | 'medium' | 'high' | 'critical',
      ip_address: item.ip_address as string | null,
      user_agent: item.user_agent as string | null
    }));
  }

  async resolveSecurityEvent(eventId: string, resolvedBy: string): Promise<void> {
    const { error } = await supabase
      .from('security_events')
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', eventId);

    if (error) throw error;
  }

  // 2FA Management
  async setup2FA(userId: string, secret: string): Promise<void> {
    const { error } = await supabase
      .from('user_2fa')
      .upsert({ 
        user_id: userId, 
        secret,
        enabled: false 
      });

    if (error) throw error;
  }

  async enable2FA(userId: string, backupCodes: string[]): Promise<void> {
    const { error } = await supabase
      .from('user_2fa')
      .update({ 
        enabled: true,
        backup_codes: backupCodes,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  async disable2FA(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_2fa')
      .update({ 
        enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  async get2FAStatus(userId: string): Promise<User2FA | null> {
    const { data, error } = await supabase
      .from('user_2fa')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // API Token Management
  async createApiToken(name: string, permissions: string[], expiresAt?: string): Promise<ApiToken> {
    const token = crypto.randomUUID();
    const tokenHash = btoa(token); // Simple hash for demo

    const { data, error } = await supabase
      .from('api_tokens')
      .insert({
        name,
        token_hash: tokenHash,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        permissions,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;
    return { 
      ...data, 
      token_hash: token,
      permissions: (data.permissions || []) as string[]
    }; // Return actual token once
  }

  async getApiTokens(): Promise<ApiToken[]> {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      permissions: (item.permissions || []) as string[]
    }));
  }

  async revokeApiToken(tokenId: string): Promise<void> {
    const { error } = await supabase
      .from('api_tokens')
      .update({ is_active: false })
      .eq('id', tokenId);

    if (error) throw error;
  }

  // Business Intelligence
  async createBIReport(report: Omit<BIReport, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<BIReport> {
    const { data, error } = await supabase
      .from('bi_reports')
      .insert({
        ...report,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBIReports(): Promise<BIReport[]> {
    const { data, error } = await supabase
      .from('bi_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async executeReport(reportId: string): Promise<ReportExecution> {
    const startTime = Date.now();
    
    // Get report config
    const { data: report, error: reportError } = await supabase
      .from('bi_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;

    // Execute the report query based on config
    let resultData;
    try {
      // This is a simplified version - in reality you'd parse the query_config
      // and build appropriate Supabase queries
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(100);

      if (error) throw error;
      resultData = data;
    } catch (error) {
      // Log execution failure
      const { data: execution } = await supabase
        .from('report_executions')
        .insert({
          report_id: reportId,
          status: 'failed',
          error_message: (error as Error).message,
          execution_time_ms: Date.now() - startTime,
          executed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      throw error;
    }

    // Log successful execution
    const { data: execution, error: execError } = await supabase
      .from('report_executions')
      .insert({
        report_id: reportId,
        status: 'completed',
        result_data: resultData,
        execution_time_ms: Date.now() - startTime,
        executed_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (execError) throw execError;
    return {
      ...execution,
      status: execution.status as 'running' | 'completed' | 'failed'
    };
  }

  // System Settings
  async getSystemSettings(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateSystemSetting(key: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        value,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('key', key);

    if (error) throw error;
  }

  // Enterprise Dashboard Stats
  async getEnterpriseStats(): Promise<EnterpriseStats> {
    // This would normally be multiple parallel queries
    // Simplified for demo
    const stats: EnterpriseStats = {
      totalUsers: 0,
      activeUsers: 0,
      totalOrders: 0,
      revenue: 0,
      securityEvents: 0,
      systemHealth: 'healthy'
    };

    try {
      // Get basic counts (simplified)
      const [
        { count: totalUsers }, 
        { count: totalOrders },
        { count: securityEvents }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('security_events').select('*', { count: 'exact', head: true }).eq('resolved', false)
      ]);

      stats.totalUsers = totalUsers || 0;
      stats.totalOrders = totalOrders || 0;
      stats.securityEvents = securityEvents || 0;
      stats.activeUsers = Math.floor(stats.totalUsers * 0.7); // Demo calculation
      stats.revenue = stats.totalOrders * 125.50; // Demo calculation
      
      // Simple health check based on security events
      if (stats.securityEvents > 10) {
        stats.systemHealth = 'critical';
      } else if (stats.securityEvents > 5) {
        stats.systemHealth = 'warning';
      }

    } catch (error) {
      console.error('Error fetching enterprise stats:', error);
    }

    return stats;
  }
}

export const enterpriseService = new EnterpriseService();