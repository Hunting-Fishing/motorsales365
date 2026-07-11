
-- Create FAQ table for dynamic FAQ management
CREATE TABLE public.help_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system status table for real-time monitoring
CREATE TABLE public.system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance')),
  uptime_percentage NUMERIC(5,2) DEFAULT 100.00,
  response_time_ms INTEGER DEFAULT 0,
  last_check_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system incidents table
CREATE TABLE public.system_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_services TEXT[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create help analytics table for real usage tracking
CREATE TABLE public.help_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'article_view', 'search', 'faq_view', 'download', 'feedback')),
  resource_type TEXT CHECK (resource_type IN ('article', 'faq', 'resource', 'learning_path')),
  resource_id UUID,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create help feedback table
CREATE TABLE public.help_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('article', 'faq', 'resource', 'learning_path', 'general')),
  resource_id UUID,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user progress tracking for learning paths
CREATE TABLE public.help_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  learning_path_id UUID REFERENCES public.help_learning_paths(id) NOT NULL,
  completed_steps JSONB DEFAULT '[]',
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, learning_path_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.help_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for help_faq
CREATE POLICY "Everyone can view active FAQs"
ON public.help_faq FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage FAQs"
ON public.help_faq FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- RLS Policies for system_status
CREATE POLICY "Everyone can view system status"
ON public.system_status FOR SELECT
USING (true);

CREATE POLICY "Admins can manage system status"
ON public.system_status FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- RLS Policies for system_incidents
CREATE POLICY "Everyone can view system incidents"
ON public.system_incidents FOR SELECT
USING (true);

CREATE POLICY "Admins can manage system incidents"
ON public.system_incidents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- RLS Policies for help_analytics
CREATE POLICY "Users can create analytics events"
ON public.help_analytics FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Admins can view all analytics"
ON public.help_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- RLS Policies for help_feedback
CREATE POLICY "Users can create feedback"
ON public.help_feedback FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback"
ON public.help_feedback FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
ON public.help_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- RLS Policies for help_user_progress
CREATE POLICY "Users can manage their own progress"
ON public.help_user_progress FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add triggers for updated_at
CREATE TRIGGER update_help_faq_updated_at
BEFORE UPDATE ON public.help_faq
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_status_updated_at
BEFORE UPDATE ON public.system_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_incidents_updated_at
BEFORE UPDATE ON public.system_incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial FAQ data
INSERT INTO public.help_faq (question, answer, category, order_index) VALUES
('How do I create a new work order?', 'To create a new work order, navigate to the Work Orders section and click "New Work Order". Fill in the customer information, vehicle details, and service requirements.', 'work_orders', 1),
('How do I manage inventory?', 'Go to the Inventory section to view, add, and manage your parts and supplies. You can track quantities, set reorder points, and manage suppliers.', 'inventory', 2),
('How do I add a new customer?', 'In the Customers section, click "Add Customer" and fill in their contact information, vehicle details, and any special notes.', 'customers', 3),
('How do I generate reports?', 'Visit the Reports section to create various business reports including financial summaries, work order analytics, and inventory reports.', 'reports', 4),
('How do I update my shop settings?', 'Go to Settings to configure your shop information, business hours, pricing, and system preferences.', 'settings', 5),
('What are the different user roles?', 'The system supports multiple roles: Owner (full access), Admin (management access), Manager (operational access), Technician (work order access), and Reception (customer service access).', 'users', 6),
('How do I backup my data?', 'Your data is automatically backed up in the cloud. You can also export data manually from the Reports section for additional backup.', 'data', 7),
('How do I contact support?', 'You can contact support through the Help section, submit a support ticket, or email our support team directly.', 'support', 8);

-- Insert initial system status data
INSERT INTO public.system_status (service_name, status, uptime_percentage, response_time_ms, description) VALUES
('API Service', 'operational', 99.9, 120, 'Core API services running normally'),
('Database', 'operational', 99.95, 45, 'Database performance optimal'),
('File Storage', 'operational', 99.8, 200, 'File upload and storage services operational'),
('Authentication', 'operational', 99.99, 80, 'User authentication services running smoothly'),
('Email Service', 'operational', 99.7, 1500, 'Email notifications and communications active'),
('Backup System', 'operational', 100.0, 30, 'Automated backup system functioning normally');

-- Function to track help analytics
CREATE OR REPLACE FUNCTION public.track_help_analytics(
  p_event_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  analytics_id UUID;
BEGIN
  INSERT INTO public.help_analytics (
    event_type,
    resource_type,
    resource_id,
    user_id,
    metadata
  ) VALUES (
    p_event_type,
    p_resource_type,
    p_resource_id,
    auth.uid(),
    p_metadata
  ) RETURNING id INTO analytics_id;
  
  RETURN analytics_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update FAQ view count
CREATE OR REPLACE FUNCTION public.increment_faq_views(faq_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.help_faq 
  SET view_count = view_count + 1 
  WHERE id = faq_id;
  
  -- Track analytics
  PERFORM public.track_help_analytics('faq_view', 'faq', faq_id);
END;
$$ LANGUAGE plpgsql;

-- Function to submit help feedback
CREATE OR REPLACE FUNCTION public.submit_help_feedback(
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_rating INTEGER DEFAULT NULL,
  p_is_helpful BOOLEAN DEFAULT NULL,
  p_feedback_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  feedback_id UUID;
BEGIN
  INSERT INTO public.help_feedback (
    resource_type,
    resource_id,
    user_id,
    rating,
    is_helpful,
    feedback_text
  ) VALUES (
    p_resource_type,
    p_resource_id,
    auth.uid(),
    p_rating,
    p_is_helpful,
    p_feedback_text
  ) RETURNING id INTO feedback_id;
  
  -- Update helpful counts for FAQ
  IF p_resource_type = 'faq' AND p_resource_id IS NOT NULL THEN
    IF p_is_helpful = true THEN
      UPDATE public.help_faq 
      SET helpful_count = helpful_count + 1 
      WHERE id = p_resource_id;
    ELSIF p_is_helpful = false THEN
      UPDATE public.help_faq 
      SET not_helpful_count = not_helpful_count + 1 
      WHERE id = p_resource_id;
    END IF;
  END IF;
  
  -- Track analytics
  PERFORM public.track_help_analytics('feedback', p_resource_type, p_resource_id);
  
  RETURN feedback_id;
END;
$$ LANGUAGE plpgsql;
