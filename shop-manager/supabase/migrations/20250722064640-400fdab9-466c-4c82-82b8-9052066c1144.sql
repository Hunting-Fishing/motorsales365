
-- Create help categories table
CREATE TABLE public.help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create help articles table
CREATE TABLE public.help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category_id UUID REFERENCES public.help_categories(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_read_time INTEGER DEFAULT 5,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  search_vector tsvector,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create learning paths table
CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration TEXT,
  target_role TEXT,
  prerequisites TEXT[],
  learning_objectives TEXT[],
  completion_reward TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create learning path steps table
CREATE TABLE public.learning_path_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.help_articles(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT true,
  estimated_time INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create help resources table
CREATE TABLE public.help_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT DEFAULT 'template' CHECK (resource_type IN ('template', 'calculator', 'guide', 'video', 'download')),
  file_url TEXT,
  file_size INTEGER,
  download_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES public.help_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create support ticket categories table
CREATE TABLE public.support_ticket_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  sla_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create support ticket comments table
CREATE TABLE public.support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachment_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public read access for help content)
CREATE POLICY "Anyone can view help categories" ON public.help_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view help articles" ON public.help_articles FOR SELECT USING (published = true);
CREATE POLICY "Anyone can view learning paths" ON public.learning_paths FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view learning path steps" ON public.learning_path_steps FOR SELECT USING (true);
CREATE POLICY "Anyone can view help resources" ON public.help_resources FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view support ticket categories" ON public.support_ticket_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view support ticket comments" ON public.support_ticket_comments FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin policies for content management
CREATE POLICY "Admins can manage help categories" ON public.help_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
          WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

CREATE POLICY "Admins can manage help articles" ON public.help_articles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
          WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- Populate help categories
INSERT INTO public.help_categories (name, description, icon, color, display_order) VALUES
('Getting Started', 'Essential guides for new users', 'BookOpen', '#10B981', 1),
('Work Orders', 'Managing work orders and job lines', 'Wrench', '#3B82F6', 2),
('Customer Management', 'Customer profiles and communication', 'Users', '#8B5CF6', 3),
('Inventory', 'Parts and inventory management', 'Package', '#F59E0B', 4),
('Invoicing', 'Billing and payment processing', 'Receipt', '#EF4444', 5),
('Reports', 'Analytics and business insights', 'BarChart3', '#06B6D4', 6),
('Team Management', 'User roles and permissions', 'UserCheck', '#84CC16', 7),
('Settings', 'System configuration and preferences', 'Settings', '#6B7280', 8),
('Mobile App', 'Using the mobile application', 'Smartphone', '#EC4899', 9),
('Integrations', 'Third-party software connections', 'Zap', '#F97316', 10),
('Troubleshooting', 'Common issues and solutions', 'AlertCircle', '#DC2626', 11),
('Advanced Features', 'Power user functionality', 'Zap', '#7C3AED', 12);

-- Populate help articles (comprehensive content)
INSERT INTO public.help_articles (title, content, excerpt, category_id, difficulty_level, estimated_read_time, tags) VALUES
('Shop Setup Wizard', 'Complete guide to setting up your automotive shop profile, including business information, service areas, and initial configuration...', 'Get started with the essential setup process', (SELECT id FROM help_categories WHERE name = 'Getting Started'), 'beginner', 8, ARRAY['setup', 'configuration', 'onboarding']),
('Creating Your First Work Order', 'Step-by-step walkthrough of creating work orders, adding job lines, and managing customer vehicles...', 'Learn the fundamentals of work order creation', (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'beginner', 12, ARRAY['work-orders', 'jobs', 'vehicles']),
('Customer Profile Management', 'How to create, edit, and maintain customer profiles with contact information, vehicle history, and preferences...', 'Master customer relationship management', (SELECT id FROM help_categories WHERE name = 'Customer Management'), 'beginner', 10, ARRAY['customers', 'profiles', 'crm']),
('Inventory Basics', 'Understanding parts management, stock levels, suppliers, and automated reordering systems...', 'Essential inventory management concepts', (SELECT id FROM help_categories WHERE name = 'Inventory'), 'beginner', 15, ARRAY['inventory', 'parts', 'suppliers']),
('Invoice Generation', 'Creating professional invoices from work orders, applying discounts, and payment processing...', 'Complete invoicing workflow guide', (SELECT id FROM help_categories WHERE name = 'Invoicing'), 'intermediate', 18, ARRAY['invoicing', 'billing', 'payments']),
('Advanced Work Order Features', 'Templates, recurring services, bulk operations, and workflow automation for work orders...', 'Power user work order management', (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'advanced', 25, ARRAY['work-orders', 'templates', 'automation']),
('Team Roles and Permissions', 'Setting up user accounts, defining roles, and managing access permissions across your team...', 'Comprehensive team management guide', (SELECT id FROM help_categories WHERE name = 'Team Management'), 'intermediate', 20, ARRAY['users', 'roles', 'permissions']),
('Business Analytics Dashboard', 'Understanding key metrics, generating reports, and making data-driven business decisions...', 'Leverage analytics for business growth', (SELECT id FROM help_categories WHERE name = 'Reports'), 'intermediate', 22, ARRAY['analytics', 'reports', 'metrics']),
('Mobile App Setup', 'Installing and configuring the mobile app for technicians and field service management...', 'Mobile workforce management', (SELECT id FROM help_categories WHERE name = 'Mobile App'), 'beginner', 12, ARRAY['mobile', 'app', 'technicians']),
('API Integration Guide', 'Connecting third-party software, webhooks, and automated data synchronization...', 'Advanced integration capabilities', (SELECT id FROM help_categories WHERE name = 'Integrations'), 'advanced', 30, ARRAY['api', 'integrations', 'webhooks']);

-- Populate learning paths
INSERT INTO public.learning_paths (title, description, difficulty_level, estimated_duration, target_role, prerequisites, learning_objectives) VALUES
('New Shop Owner Onboarding', 'Complete onboarding path for new automotive shop owners', 'beginner', '2-3 hours', 'Shop Owner', ARRAY[]::TEXT[], ARRAY['Set up shop profile', 'Create first work order', 'Understand basic workflows']),
('Technician Mobile Training', 'Mobile app training for field technicians and service staff', 'beginner', '1-2 hours', 'Technician', ARRAY['Basic system familiarity'], ARRAY['Use mobile app effectively', 'Update work orders on-the-go', 'Communicate with customers']),
('Advanced Manager Training', 'Comprehensive training for shop managers and supervisors', 'intermediate', '4-5 hours', 'Manager', ARRAY['Basic system knowledge'], ARRAY['Manage team permissions', 'Generate business reports', 'Optimize workflows']),
('Customer Service Excellence', 'Best practices for service advisors and customer-facing staff', 'intermediate', '3-4 hours', 'Service Advisor', ARRAY['Customer management basics'], ARRAY['Excel at customer communication', 'Handle complaints effectively', 'Maximize customer satisfaction']),
('Inventory Management Mastery', 'Complete inventory and parts management training', 'intermediate', '3-4 hours', 'Parts Manager', ARRAY['Basic inventory knowledge'], ARRAY['Optimize stock levels', 'Manage suppliers', 'Reduce costs']),
('Financial Management Training', 'Invoicing, payments, and financial reporting for business owners', 'advanced', '5-6 hours', 'Owner/Manager', ARRAY['Basic invoicing knowledge'], ARRAY['Master financial workflows', 'Understand key metrics', 'Improve profitability']),
('System Administrator Path', 'Complete system setup and administration training', 'advanced', '6-8 hours', 'Administrator', ARRAY['Technical aptitude'], ARRAY['Configure system settings', 'Manage integrations', 'Ensure data security']),
('Quick Start Guide', 'Fast-track introduction for experienced automotive professionals', 'beginner', '30-45 minutes', 'All Users', ARRAY['Automotive industry experience'], ARRAY['Navigate the system', 'Complete basic tasks', 'Find additional resources']);

-- Populate help resources
INSERT INTO public.help_resources (title, description, resource_type, tags, category_id) VALUES
('Work Order Template', 'Professional work order template with all standard fields', 'template', ARRAY['template', 'work-order'], (SELECT id FROM help_categories WHERE name = 'Work Orders')),
('Invoice Template', 'Customizable invoice template for automotive services', 'template', ARRAY['template', 'invoice', 'billing'], (SELECT id FROM help_categories WHERE name = 'Invoicing')),
('Labor Rate Calculator', 'Interactive calculator for determining optimal labor rates', 'calculator', ARRAY['calculator', 'pricing', 'labor'], (SELECT id FROM help_categories WHERE name = 'Reports')),
('Customer Intake Form', 'Comprehensive customer information collection form', 'template', ARRAY['template', 'customer', 'intake'], (SELECT id FROM help_categories WHERE name = 'Customer Management')),
('Parts Ordering Checklist', 'Systematic checklist for efficient parts ordering', 'guide', ARRAY['checklist', 'parts', 'ordering'], (SELECT id FROM help_categories WHERE name = 'Inventory')),
('Daily Operations Checklist', 'Daily workflow checklist for smooth shop operations', 'guide', ARRAY['checklist', 'operations', 'workflow'], (SELECT id FROM help_categories WHERE name = 'Getting Started')),
('Team Training Manual', 'Comprehensive manual for training new team members', 'guide', ARRAY['training', 'manual', 'team'], (SELECT id FROM help_categories WHERE name = 'Team Management')),
('Mobile App User Guide', 'Complete guide for using the mobile application', 'guide', ARRAY['mobile', 'guide', 'app'], (SELECT id FROM help_categories WHERE name = 'Mobile App')),
('Integration Setup Guide', 'Step-by-step integration configuration guide', 'guide', ARRAY['integration', 'setup', 'api'], (SELECT id FROM help_categories WHERE name = 'Integrations')),
('Troubleshooting Flowchart', 'Visual flowchart for common technical issues', 'guide', ARRAY['troubleshooting', 'flowchart', 'support'], (SELECT id FROM help_categories WHERE name = 'Troubleshooting')),
('ROI Calculator', 'Calculate return on investment for shop improvements', 'calculator', ARRAY['calculator', 'roi', 'business'], (SELECT id FROM help_categories WHERE name = 'Reports')),
('Customer Survey Template', 'Template for collecting customer feedback', 'template', ARRAY['template', 'survey', 'feedback'], (SELECT id FROM help_categories WHERE name = 'Customer Management')),
('Inventory Audit Checklist', 'Systematic approach to inventory auditing', 'guide', ARRAY['checklist', 'audit', 'inventory'], (SELECT id FROM help_categories WHERE name = 'Inventory')),
('Service Menu Template', 'Professional service menu template', 'template', ARRAY['template', 'services', 'menu'], (SELECT id FROM help_categories WHERE name = 'Getting Started')),
('Financial Report Template', 'Monthly financial reporting template', 'template', ARRAY['template', 'financial', 'reporting'], (SELECT id FROM help_categories WHERE name = 'Reports')),
('Safety Checklist', 'Comprehensive workplace safety checklist', 'guide', ARRAY['safety', 'checklist', 'compliance'], (SELECT id FROM help_categories WHERE name = 'Settings'));

-- Populate support ticket categories
INSERT INTO public.support_ticket_categories (name, description, color, sla_hours) VALUES
('Technical Issues', 'System bugs, errors, and technical problems', '#EF4444', 4),
('Account & Billing', 'Subscription, payment, and account issues', '#F59E0B', 24),
('Feature Requests', 'New feature suggestions and improvements', '#10B981', 72),
('Training & Support', 'Help with using system features', '#3B82F6', 8),
('Data & Integration', 'Import/export and third-party integrations', '#8B5CF6', 12),
('General Inquiry', 'General questions and information requests', '#6B7280', 24);

-- Create search index for articles
CREATE INDEX idx_help_articles_search ON public.help_articles USING gin(search_vector);
CREATE INDEX idx_help_articles_category ON public.help_articles(category_id);
CREATE INDEX idx_help_articles_published ON public.help_articles(published);
CREATE INDEX idx_help_resources_type ON public.help_resources(resource_type);
CREATE INDEX idx_learning_path_steps_order ON public.learning_path_steps(path_id, step_order);

-- Update search vectors for existing articles
UPDATE public.help_articles SET search_vector = to_tsvector('english', title || ' ' || content || ' ' || COALESCE(excerpt, ''));

-- Create function to update search vector automatically
CREATE OR REPLACE FUNCTION update_help_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', NEW.title || ' ' || NEW.content || ' ' || COALESCE(NEW.excerpt, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic search vector updates
CREATE TRIGGER update_help_article_search_trigger
  BEFORE INSERT OR UPDATE ON public.help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_help_article_search_vector();

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_help_categories_updated_at BEFORE UPDATE ON public.help_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON public.learning_paths FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_help_resources_updated_at BEFORE UPDATE ON public.help_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
