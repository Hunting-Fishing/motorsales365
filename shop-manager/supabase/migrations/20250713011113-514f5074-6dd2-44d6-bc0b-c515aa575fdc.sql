-- Phase 4: Enterprise & Scalability Database Foundation (Fixed)

-- Drop existing table if it exists to recreate properly
DROP TABLE IF EXISTS public.permissions CASCADE;

-- Enhanced roles and permissions
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Audit logging system
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance monitoring
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  context JSONB,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  description TEXT,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Two-factor authentication
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- API tokens for external integrations
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  permissions JSONB DEFAULT '[]',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business intelligence reports
CREATE TABLE IF NOT EXISTS public.bi_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  query_config JSONB NOT NULL,
  chart_config JSONB,
  schedule JSONB,
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Report executions
CREATE TABLE IF NOT EXISTS public.report_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.bi_reports(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  result_data JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  executed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System settings for enterprise features
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Insert default permissions
INSERT INTO public.permissions (name, description, module, action) VALUES
('users.read', 'View users', 'users', 'read'),
('users.create', 'Create users', 'users', 'create'),
('users.update', 'Update users', 'users', 'update'),
('users.delete', 'Delete users', 'users', 'delete'),
('products.read', 'View products', 'products', 'read'),
('products.create', 'Create products', 'products', 'create'),
('products.update', 'Update products', 'products', 'update'),
('products.delete', 'Delete products', 'products', 'delete'),
('orders.read', 'View orders', 'orders', 'read'),
('orders.create', 'Create orders', 'orders', 'create'),
('orders.update', 'Update orders', 'orders', 'update'),
('orders.delete', 'Delete orders', 'orders', 'delete'),
('analytics.read', 'View analytics', 'analytics', 'read'),
('settings.read', 'View settings', 'settings', 'read'),
('settings.update', 'Update settings', 'settings', 'update'),
('audit.read', 'View audit logs', 'audit', 'read'),
('security.read', 'View security events', 'security', 'read'),
('api.read', 'View API tokens', 'api', 'read'),
('api.create', 'Create API tokens', 'api', 'create'),
('reports.read', 'View reports', 'reports', 'read'),
('reports.create', 'Create reports', 'reports', 'create'),
('reports.update', 'Update reports', 'reports', 'update'),
('reports.delete', 'Delete reports', 'reports', 'delete');

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description, is_public) VALUES
('security.max_login_attempts', '5', 'Maximum login attempts before lockout', false),
('security.lockout_duration_minutes', '30', 'Account lockout duration in minutes', false),
('security.password_expiry_days', '90', 'Password expiry period in days', false),
('security.2fa_required', 'false', 'Whether 2FA is required for all users', false),
('performance.cache_ttl_seconds', '3600', 'Cache time-to-live in seconds', false),
('audit.retention_days', '365', 'Audit log retention period in days', false),
('api.rate_limit_per_hour', '1000', 'API rate limit per hour', false);