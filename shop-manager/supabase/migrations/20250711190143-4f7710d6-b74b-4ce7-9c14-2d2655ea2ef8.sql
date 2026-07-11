-- Create system_metrics table for performance monitoring
CREATE TABLE public.system_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('good', 'warning', 'critical')),
  trend TEXT NOT NULL CHECK (trend IN ('up', 'down', 'stable')),
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create performance_logs table for historical data
CREATE TABLE public.performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can view system metrics" 
ON public.system_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'technician', 'manager')
  )
);

CREATE POLICY "Staff can insert system metrics" 
ON public.system_metrics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'technician')
  )
);

CREATE POLICY "Staff can view performance logs" 
ON public.performance_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'technician', 'manager')
  )
);

CREATE POLICY "Staff can insert performance logs" 
ON public.performance_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name IN ('admin', 'technician')
  )
);

-- Create indexes for performance
CREATE INDEX idx_system_metrics_name_recorded ON public.system_metrics (metric_name, recorded_at DESC);
CREATE INDEX idx_performance_logs_name_timestamp ON public.performance_logs (metric_name, timestamp DESC);

-- Insert sample metrics data
INSERT INTO public.system_metrics (metric_name, metric_value, metric_unit, status, trend, metadata) VALUES
('Page Load Time', 1.2, 's', 'good', 'stable', '{"target": 2.0, "threshold_warning": 3.0, "threshold_critical": 5.0}'),
('API Response Time', 245, 'ms', 'good', 'down', '{"target": 200, "threshold_warning": 500, "threshold_critical": 1000}'),
('Database Query Time', 45, 'ms', 'warning', 'up', '{"target": 50, "threshold_warning": 100, "threshold_critical": 200}'),
('Memory Usage', 78, '%', 'warning', 'up', '{"target": 60, "threshold_warning": 80, "threshold_critical": 95}'),
('Error Rate', 0.02, '%', 'good', 'stable', '{"target": 0, "threshold_warning": 1, "threshold_critical": 5}'),
('Active Users', 127, 'users', 'good', 'up', '{"target": 100, "threshold_warning": 500, "threshold_critical": 1000}');

-- Create function to get latest metrics
CREATE OR REPLACE FUNCTION public.get_latest_system_metrics()
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  status TEXT,
  trend TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
)
LANGUAGE SQL
AS $$
  SELECT DISTINCT ON (m.metric_name)
    m.metric_name,
    m.metric_value,
    m.metric_unit,
    m.status,
    m.trend,
    m.recorded_at,
    m.metadata
  FROM public.system_metrics m
  ORDER BY m.metric_name, m.recorded_at DESC;
$$;