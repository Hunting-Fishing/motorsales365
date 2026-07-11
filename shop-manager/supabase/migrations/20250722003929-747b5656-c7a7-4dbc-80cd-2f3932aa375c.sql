
-- Create tables for comprehensive help system
CREATE TABLE IF NOT EXISTS help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for learning paths
CREATE TABLE IF NOT EXISTS help_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration TEXT,
  target_role TEXT,
  articles JSONB DEFAULT '[]'::jsonb,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for help resources (downloads, templates, tools)
CREATE TABLE IF NOT EXISTS help_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN ('template', 'tool', 'video', 'document', 'calculator')),
  file_url TEXT,
  download_url TEXT,
  category_id UUID REFERENCES help_categories(id),
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add category_id to existing help_articles table if not exists
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES help_categories(id);
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 5;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE help_articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_resources ENABLE ROW LEVEL SECURITY;

-- Create policies for help_categories
CREATE POLICY "Anyone can view help categories" ON help_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage help categories" ON help_categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- Create policies for help_learning_paths
CREATE POLICY "Anyone can view learning paths" ON help_learning_paths FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage learning paths" ON help_learning_paths FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- Create policies for help_resources
CREATE POLICY "Anyone can view help resources" ON help_resources FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage help resources" ON help_resources FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
  )
);

-- Insert help categories
INSERT INTO help_categories (name, description, icon, sort_order) VALUES
('Getting Started', 'Essential guides for new users', 'Rocket', 1),
('Work Orders', 'Complete work order management system', 'Wrench', 2),
('Customer Management', 'Customer relationship and service tools', 'Users', 3),
('Inventory Management', 'Parts, stock, and inventory control', 'Package', 4),
('Financial Management', 'Billing, invoicing, and financial tools', 'DollarSign', 5),
('Reporting & Analytics', 'Business intelligence and insights', 'BarChart3', 6),
('Integrations', 'Third-party connections and APIs', 'Zap', 7),
('Mobile & Remote', 'Mobile app and remote work features', 'Smartphone', 8),
('Security & Compliance', 'Data protection and compliance', 'Shield', 9),
('Nonprofit Features', 'Specialized nonprofit functionality', 'Heart', 10),
('Troubleshooting', 'Common issues and solutions', 'AlertCircle', 11),
('Advanced Features', 'Power user and admin features', 'Settings', 12);

-- Insert comprehensive help articles
INSERT INTO help_articles (title, content, category_id, difficulty_level, estimated_read_time, tags, is_featured) VALUES
-- Getting Started Category
('Complete Setup Guide', 'Welcome to ServicePro! This comprehensive guide will walk you through setting up your service management system from start to finish...', 
 (SELECT id FROM help_categories WHERE name = 'Getting Started'), 'beginner', 15, '["setup", "onboarding", "beginner"]', true),

('First Week Checklist', 'Your first week with ServicePro - essential tasks to get you up and running quickly...', 
 (SELECT id FROM help_categories WHERE name = 'Getting Started'), 'beginner', 10, '["checklist", "onboarding"]', true),

-- Work Orders Category  
('Work Order Creation Masterclass', 'Learn how to create comprehensive work orders that capture all necessary information for efficient service delivery...', 
 (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'intermediate', 20, '["work-orders", "creation", "best-practices"]', true),

('Advanced Work Order Workflows', 'Streamline your operations with automated workflows, status transitions, and approval processes...', 
 (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'advanced', 25, '["workflows", "automation", "advanced"]', false),

('Work Order Status Management', 'Master the art of work order status tracking with custom statuses, automated notifications, and progress monitoring...', 
 (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'intermediate', 15, '["status", "tracking", "management"]', false),

('Technician Assignment & Scheduling', 'Optimize your workforce with smart technician assignment, scheduling tools, and workload balancing...', 
 (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'intermediate', 18, '["scheduling", "technicians", "assignment"]', false),

('Work Order Templates Guide', 'Create reusable templates for common services to speed up work order creation and ensure consistency...', 
 (SELECT id FROM help_categories WHERE name = 'Work Orders'), 'beginner', 12, '["templates", "efficiency", "standardization"]', false),

-- Customer Management Category
('Customer Onboarding Excellence', 'Create exceptional first impressions with streamlined customer onboarding processes and welcome workflows...', 
 (SELECT id FROM help_categories WHERE name = 'Customer Management'), 'intermediate', 16, '["onboarding", "customer-experience", "workflows"]', true),

('Customer Portal Configuration', 'Set up and customize your customer portal for self-service, appointment booking, and service history access...', 
 (SELECT id FROM help_categories WHERE name = 'Customer Management'), 'intermediate', 14, '["portal", "self-service", "configuration"]', false),

('Customer Communication Templates', 'Master customer communication with professional email templates, SMS notifications, and automated follow-ups...', 
 (SELECT id FROM help_categories WHERE name = 'Customer Management'), 'beginner', 10, '["communication", "templates", "automation"]', false),

('Customer History & Service Records', 'Maintain comprehensive customer histories, service records, and relationship tracking for superior service...', 
 (SELECT id FROM help_categories WHERE name = 'Customer Management'), 'intermediate', 13, '["history", "records", "tracking"]', false),

-- Inventory Management Category
('Inventory Setup & Configuration', 'Build a robust inventory system with proper categorization, units of measure, and stock management...', 
 (SELECT id FROM help_categories WHERE name = 'Inventory Management'), 'intermediate', 20, '["inventory", "setup", "configuration"]', true),

('Parts Management & Categorization', 'Organize your parts inventory with smart categorization, vendor management, and cross-referencing...', 
 (SELECT id FROM help_categories WHERE name = 'Inventory Management'), 'beginner', 15, '["parts", "categorization", "organization"]', false),

('Stock Level Monitoring & Alerts', 'Never run out of critical parts with automated stock level monitoring, reorder points, and alert systems...', 
 (SELECT id FROM help_categories WHERE name = 'Inventory Management'), 'intermediate', 12, '["stock-levels", "alerts", "monitoring"]', false),

('Purchase Orders & Vendor Management', 'Streamline procurement with purchase order management, vendor relationships, and cost tracking...', 
 (SELECT id FROM help_categories WHERE name = 'Inventory Management'), 'intermediate', 18, '["purchase-orders", "vendors", "procurement"]', false),

-- Financial Management Category
('Invoicing & Payment Processing', 'Master the art of professional invoicing, payment processing, and accounts receivable management...', 
 (SELECT id FROM help_categories WHERE name = 'Financial Management'), 'intermediate', 17, '["invoicing", "payments", "billing"]', true),

('QuickBooks Integration Guide', 'Seamlessly integrate with QuickBooks for automated financial data sync and accounting workflows...', 
 (SELECT id FROM help_categories WHERE name = 'Financial Management'), 'advanced', 22, '["quickbooks", "integration", "accounting"]', false),

('Tax Management & Reporting', 'Handle sales tax, use tax, and financial reporting requirements with confidence and accuracy...', 
 (SELECT id FROM help_categories WHERE name = 'Financial Management'), 'intermediate', 16, '["tax", "reporting", "compliance"]', false),

-- Reporting & Analytics Category
('Custom Report Creation', 'Build powerful custom reports to track KPIs, analyze trends, and make data-driven business decisions...', 
 (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'), 'advanced', 25, '["reports", "custom", "analytics"]', true),

('Dashboard Configuration', 'Create personalized dashboards with key metrics, real-time data, and actionable insights for your business...', 
 (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'), 'intermediate', 14, '["dashboard", "metrics", "configuration"]', false),

('Business Intelligence Setup', 'Transform your data into actionable insights with advanced BI tools, trend analysis, and forecasting...', 
 (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'), 'advanced', 30, '["business-intelligence", "analytics", "insights"]', false),

-- Integrations Category
('API Integration Guide', 'Connect ServicePro with external systems using our comprehensive API documentation and best practices...', 
 (SELECT id FROM help_categories WHERE name = 'Integrations'), 'advanced', 35, '["api", "integration", "development"]', false),

('Third-Party Integrations', 'Explore available integrations with popular business tools and learn how to set them up effectively...', 
 (SELECT id FROM help_categories WHERE name = 'Integrations'), 'intermediate', 20, '["third-party", "integrations", "tools"]', true),

-- Mobile & Remote Category
('Mobile App Setup & Usage', 'Get the most out of the ServicePro mobile app with setup instructions and feature walkthroughs...', 
 (SELECT id FROM help_categories WHERE name = 'Mobile & Remote'), 'beginner', 12, '["mobile", "app", "setup"]', true),

('Remote Work Best Practices', 'Enable effective remote work with cloud access, mobile workflows, and collaboration tools...', 
 (SELECT id FROM help_categories WHERE name = 'Mobile & Remote'), 'intermediate', 15, '["remote-work", "collaboration", "cloud"]', false),

-- Security & Compliance Category
('Security Best Practices', 'Protect your business data with comprehensive security measures, access controls, and audit trails...', 
 (SELECT id FROM help_categories WHERE name = 'Security & Compliance'), 'intermediate', 18, '["security", "best-practices", "protection"]', true),

('Data Protection & Privacy', 'Ensure compliance with data protection regulations and maintain customer privacy standards...', 
 (SELECT id FROM help_categories WHERE name = 'Security & Compliance'), 'advanced', 22, '["privacy", "compliance", "data-protection"]', false),

-- Nonprofit Features Category
('Grant Management System', 'Track grants, manage compliance requirements, and generate required reports for nonprofit operations...', 
 (SELECT id FROM help_categories WHERE name = 'Nonprofit Features'), 'intermediate', 20, '["grants", "nonprofit", "compliance"]', false),

('Donation Tracking & Reporting', 'Manage donations, track donor relationships, and generate tax-compliant donation reports...', 
 (SELECT id FROM help_categories WHERE name = 'Nonprofit Features'), 'intermediate', 16, '["donations", "tracking", "reporting"]', false),

-- Troubleshooting Category
('Common Issues & Solutions', 'Quick solutions to the most frequently encountered issues and error messages in ServicePro...', 
 (SELECT id FROM help_categories WHERE name = 'Troubleshooting'), 'beginner', 10, '["troubleshooting", "common-issues", "solutions"]', true),

('Performance Optimization', 'Optimize ServicePro performance with database maintenance, system tuning, and best practices...', 
 (SELECT id FROM help_categories WHERE name = 'Troubleshooting'), 'advanced', 25, '["performance", "optimization", "maintenance"]', false),

-- Advanced Features Category
('Custom Development Guide', 'Extend ServicePro functionality with custom development, scripting, and advanced configuration options...', 
 (SELECT id FROM help_categories WHERE name = 'Advanced Features'), 'advanced', 40, '["development", "customization", "advanced"]', false),

('System Administration', 'Comprehensive system administration guide covering user management, permissions, and system configuration...', 
 (SELECT id FROM help_categories WHERE name = 'Advanced Features'), 'advanced', 30, '["administration", "users", "system"]', false);

-- Insert learning paths
INSERT INTO help_learning_paths (title, description, difficulty_level, estimated_duration, target_role, articles, prerequisites) VALUES
('Complete Beginner Onboarding', 'Everything you need to know to get started with ServicePro in your first 30 days', 'beginner', '4-6 weeks', 'All Users', 
 '["Complete Setup Guide", "First Week Checklist", "Work Order Creation Masterclass", "Customer Onboarding Excellence"]'::jsonb, 
 '[]'::jsonb),

('Service Manager Mastery', 'Advanced path for service managers focusing on operations, analytics, and team management', 'intermediate', '6-8 weeks', 'Manager', 
 '["Advanced Work Order Workflows", "Custom Report Creation", "Dashboard Configuration", "Technician Assignment & Scheduling"]'::jsonb, 
 '["Complete Setup Guide"]'::jsonb),

('Shop Owner Business Growth', 'Comprehensive path for shop owners focusing on business growth, financial management, and analytics', 'intermediate', '8-10 weeks', 'Owner', 
 '["Financial Management", "Business Intelligence Setup", "Customer Portal Configuration", "Third-Party Integrations"]'::jsonb, 
 '["Complete Setup Guide", "Work Order Creation Masterclass"]'::jsonb),

('Technician Efficiency Track', 'Focused path for technicians to maximize productivity with mobile tools and workflow optimization', 'beginner', '3-4 weeks', 'Technician', 
 '["Mobile App Setup & Usage", "Work Order Status Management", "Parts Management & Categorization"]'::jsonb, 
 '[]'::jsonb),

('Advanced Administrator Path', 'Technical path for system administrators covering integrations, security, and advanced configuration', 'advanced', '10-12 weeks', 'Administrator', 
 '["API Integration Guide", "Security Best Practices", "Custom Development Guide", "System Administration"]'::jsonb, 
 '["Complete Setup Guide", "Business Intelligence Setup"]'::jsonb),

('Nonprofit Operations Specialist', 'Specialized path for nonprofit organizations covering grants, donations, and compliance', 'intermediate', '6-8 weeks', 'Nonprofit Manager', 
 '["Grant Management System", "Donation Tracking & Reporting", "Tax Management & Reporting", "Data Protection & Privacy"]'::jsonb, 
 '["Complete Setup Guide"]'::jsonb);

-- Insert help resources
INSERT INTO help_resources (title, description, resource_type, category_id, tags) VALUES
('Work Order Template Library', 'Collection of professional work order templates for different service types', 'template', 
 (SELECT id FROM help_categories WHERE name = 'Work Orders'), '["templates", "work-orders", "standardization"]'::jsonb),

('Customer Communication Templates', 'Email and SMS templates for all customer touchpoints', 'template', 
 (SELECT id FROM help_categories WHERE name = 'Customer Management'), '["templates", "communication", "customer-service"]'::jsonb),

('Invoice Templates Collection', 'Professional invoice templates with customizable branding options', 'template', 
 (SELECT id FROM help_categories WHERE name = 'Financial Management'), '["templates", "invoicing", "branding"]'::jsonb),

('ROI Calculator Tool', 'Calculate return on investment for ServicePro implementation and features', 'calculator', 
 (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'), '["calculator", "roi", "business-analysis"]'::jsonb),

('Pricing Strategy Calculator', 'Optimize your service pricing with market analysis and profit margin calculators', 'calculator', 
 (SELECT id FROM help_categories WHERE name = 'Financial Management'), '["calculator", "pricing", "profit-analysis"]'::jsonb),

('Inventory Optimization Tool', 'Analyze inventory turnover and optimize stock levels for cost efficiency', 'tool', 
 (SELECT id FROM help_categories WHERE name = 'Inventory Management'), '["tool", "optimization", "inventory-analysis"]'::jsonb),

('Performance Benchmarking Tool', 'Compare your business metrics against industry standards and benchmarks', 'tool', 
 (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'), '["tool", "benchmarking", "performance"]'::jsonb),

('Setup Checklist Document', 'Comprehensive PDF checklist for complete ServicePro implementation', 'document', 
 (SELECT id FROM help_categories WHERE name = 'Getting Started'), '["checklist", "setup", "implementation"]'::jsonb),

('API Documentation Package', 'Complete API documentation with code examples and integration guides', 'document', 
 (SELECT id FROM help_categories WHERE name = 'Integrations'), '["documentation", "api", "development"]'::jsonb),

('Security Audit Checklist', 'Step-by-step security audit checklist to ensure your system is properly secured', 'document', 
 (SELECT id FROM help_categories WHERE name = 'Security & Compliance'), '["checklist", "security", "audit"]'::jsonb);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_featured ON help_articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_help_resources_category ON help_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_help_resources_type ON help_resources(resource_type);
