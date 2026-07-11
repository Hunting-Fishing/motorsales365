import { supabase } from '@/integrations/supabase/client';

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  updated_at: string;
}

export interface SystemHealthMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  recorded_at: string;
}

class SystemService {
  async getSystemSettings(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .order('settings_key', { ascending: true });

    if (error) throw error;

    return data?.map(setting => ({
      id: setting.id,
      key: setting.settings_key,
      value: setting.settings_value,
      description: `Configuration for ${setting.settings_key}`,
      category: setting.settings_key.split('_')[0] || 'general',
      updated_at: setting.updated_at || new Date().toISOString(),
    })) || [];
  }

  async updateSystemSetting(id: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('company_settings')
      .update({ 
        settings_value: value,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getSystemHealth(): Promise<SystemHealthMetric[]> {
    const { data, error } = await supabase
      .from('system_metrics')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data?.map(metric => ({
      id: metric.id,
      metric_name: metric.metric_name,
      metric_value: metric.metric_value,
      unit: metric.metric_unit || '',
      status: metric.metric_value > 80 ? 'critical' : metric.metric_value > 60 ? 'warning' : 'healthy',
      recorded_at: metric.recorded_at,
    })) || [];
  }

  async getAuditLogs(limit: number = 50) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

export const systemService = new SystemService();