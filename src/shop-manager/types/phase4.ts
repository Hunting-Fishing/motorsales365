// Phase 4: Enterprise & Scalability Types

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface AuditTrail {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

export interface PerformanceMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  context: any;
  recorded_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  description: string | null;
  metadata: any;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
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

export interface ApiToken {
  id: string;
  name: string;
  token_hash: string;
  user_id: string;
  permissions: string[];
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BIReport {
  id: string;
  name: string;
  description: string | null;
  query_config: any;
  chart_config: any;
  schedule: any;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportExecution {
  id: string;
  report_id: string;
  status: 'running' | 'completed' | 'failed';
  result_data: any;
  error_message: string | null;
  execution_time_ms: number | null;
  executed_by: string | null;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  is_public: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseStats {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  revenue: number;
  securityEvents: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'doughnut';
  title: string;
  xAxis: string;
  yAxis: string;
  colors: string[];
}

export interface QueryConfig {
  table: string;
  fields: string[];
  filters: Record<string, any>;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}