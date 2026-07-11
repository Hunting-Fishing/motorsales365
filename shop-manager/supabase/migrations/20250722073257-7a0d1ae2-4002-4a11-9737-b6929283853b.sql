
-- Phase 1: Enhanced Learning Paths with Real Content
DELETE FROM help_learning_paths WHERE title IN ('Getting Started with Shop Management', 'Advanced Inventory Management', 'Customer Service Excellence', 'Financial Management for Auto Shops');

INSERT INTO help_learning_paths (
  id, title, description, difficulty_level, estimated_duration, target_role, 
  prerequisites, learning_objectives, completion_reward, is_active,
  estimated_minutes, articles_count
) VALUES 
-- Shop Owner Paths
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Complete Shop Management Mastery',
  'Comprehensive training for new shop owners covering all aspects of running a successful automotive repair business',
  'beginner',
  '8-10 hours',
  'Shop Owner',
  '[]'::jsonb,
  '["Master work order management", "Understand financial reporting", "Learn staff management", "Implement quality control", "Develop customer retention strategies"]'::jsonb,
  'Shop Owner Certification',
  true,
  600,
  12
),
(
  'b2c3d4e5-f6g7-8901-bcde-f23456789012',
  'Financial Management & Profitability',
  'Advanced financial strategies to maximize profitability and manage cash flow effectively',
  'advanced',
  '6-8 hours',
  'Shop Owner',
  '["Basic accounting knowledge", "Shop management experience"]'::jsonb,
  '["Analyze profit margins by service", "Optimize pricing strategies", "Manage cash flow cycles", "Create financial forecasts"]'::jsonb,
  'Financial Expert Badge',
  true,
  480,
  8
),
-- Manager Paths
(
  'c3d4e5f6-g7h8-9012-cdef-345678901234',
  'Operations Management Excellence',
  'Learn to streamline shop operations, manage workflows, and optimize efficiency',
  'intermediate',
  '5-7 hours',
  'Shop Manager',
  '["Basic shop operations knowledge"]'::jsonb,
  '["Optimize scheduling systems", "Manage technician workflows", "Implement quality control", "Handle escalated issues"]'::jsonb,
  'Operations Manager Certification',
  true,
  420,
  9
),
-- Service Advisor Paths
(
  'd4e5f6g7-h8i9-0123-defg-456789012345',
  'Customer Service Excellence',
  'Master the art of customer communication and build lasting relationships',
  'beginner',
  '4-5 hours',
  'Service Advisor',
  '[]'::jsonb,
  '["Perfect customer communication", "Handle difficult situations", "Build trust and rapport", "Increase service sales"]'::jsonb,
  'Customer Champion Certificate',
  true,
  300,
  7
),
(
  'e5f6g7h8-i9j0-1234-efgh-567890123456',
  'Sales & Upselling Mastery',
  'Learn ethical sales techniques to increase revenue while helping customers',
  'intermediate',
  '3-4 hours',
  'Service Advisor',
  '["Customer service basics"]'::jsonb,
  '["Identify service opportunities", "Present recommendations effectively", "Handle price objections", "Close sales professionally"]'::jsonb,
  'Sales Professional Badge',
  true,
  240,
  6
),
-- Technician Paths
(
  'f6g7h8i9-j0k1-2345-fghi-678901234567',
  'Digital Shop Floor Mastery',
  'Learn to use digital tools effectively for efficient service delivery',
  'beginner',
  '3-4 hours',
  'Technician',
  '[]'::jsonb,
  '["Navigate work order system", "Update service progress", "Document findings", "Communicate with advisors"]'::jsonb,
  'Digital Technician Certificate',
  true,
  240,
  6
),
-- Reception Paths
(
  'g7h8i9j0-k1l2-3456-ghij-789012345678',
  'Front Desk Excellence',
  'Master appointment scheduling, customer check-in, and first impressions',
  'beginner',
  '2-3 hours',
  'Reception',
  '[]'::jsonb,
  '["Perfect phone etiquette", "Manage appointment system", "Handle customer check-in", "Coordinate with service team"]'::jsonb,
  'Reception Pro Certificate',
  true,
  180,
  5
);

-- Phase 2: Comprehensive Help Articles
INSERT INTO help_articles (
  id, title, content, category_id, tags, author_id, views, helpful_count,
  is_featured, estimated_read_time, difficulty_level, last_updated
)
SELECT 
  gen_random_uuid(),
  'Setting Up Your Dashboard',
  'Your dashboard is command central. Here''s how to customize it: 1. Click the settings gear in the top right 2. Choose which widgets to display 3. Drag and drop to rearrange 4. Set your preferred date ranges 5. Configure alerts and notifications. Pro tip: Start with the essentials - work orders, appointments, and daily revenue.',
  hc.id,
  '["dashboard", "setup", "customization", "getting-started"]'::jsonb,
  'system',
  89,
  12,
  true,
  6,
  'beginner',
  now()
FROM help_categories hc WHERE hc.name = 'Getting Started'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Work Order Lifecycle Management',
  'Understanding the complete work order process: Created → Scheduled → In Progress → Quality Check → Completed → Invoiced. Each status has specific actions available. Technicians can only update progress, while service advisors can modify estimates. Use status filters to quickly find orders at each stage.',
  hc.id,
  '["work-orders", "workflow", "status", "process"]'::jsonb,
  'system',
  156,
  23,
  true,
  8,
  'intermediate',
  now()
FROM help_categories hc WHERE hc.name = 'Getting Started'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Advanced Inventory Tracking',
  'Maximize inventory efficiency: Set up ABC analysis (A=high value/high turnover, B=moderate, C=low). Configure automatic reorder points based on lead times. Use the inventory dashboard to identify slow-moving items. Set up vendor catalogs for quick ordering. Enable barcode scanning for accuracy.',
  hc.id,
  '["inventory", "tracking", "optimization", "abc-analysis"]'::jsonb,
  'system',
  234,
  31,
  false,
  12,
  'advanced',
  now()
FROM help_categories hc WHERE hc.name = 'Advanced Features'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Customer Communication Best Practices',
  'Build lasting relationships: Always confirm contact preferences (text, email, call). Send proactive updates at key milestones. Use templates for consistency but personalize messages. Document all interactions. Follow up after service completion. Handle complaints with the LAST method: Listen, Apologize, Solve, Thank.',
  hc.id,
  '["communication", "customer-service", "relationships", "templates"]'::jsonb,
  'system',
  178,
  28,
  true,
  10,
  'intermediate',
  now()
FROM help_categories hc WHERE hc.name = 'Getting Started'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Financial Reporting Deep Dive',
  'Key reports every owner should review weekly: P&L Statement (profit margins by service type), Cash Flow (payments vs. expenses), AR Aging (outstanding invoices), Labor Efficiency (actual vs. estimated hours), Parts Margin Analysis. Set up automated delivery to your email.',
  hc.id,
  '["reports", "financial", "analytics", "kpi"]'::jsonb,
  'system',
  145,
  19,
  false,
  15,
  'advanced',
  now()
FROM help_categories hc WHERE hc.name = 'Advanced Features'
UNION ALL
SELECT 
  gen_random_uuid(),
  'User Role Management',
  'Assign appropriate permissions: Owner (full access), Manager (all except financial settings), Service Advisor (customers, work orders, estimates), Technician (work orders, time tracking), Reception (appointments, customer check-in). Review permissions quarterly for security.',
  hc.id,
  '["users", "permissions", "security", "roles"]'::jsonb,
  'system',
  198,
  22,
  false,
  7,
  'intermediate',
  now()
FROM help_categories hc WHERE hc.name = 'Account Management'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Appointment Scheduling Strategies',
  'Optimize your schedule: Block time for different service types (oil changes vs. major repairs). Leave buffer time between appointments. Set up recurring appointments for regular customers. Use waitlists for popular times. Configure automatic reminders 24 hours before.',
  hc.id,
  '["appointments", "scheduling", "calendar", "optimization"]'::jsonb,
  'system',
  267,
  35,
  true,
  9,
  'intermediate',
  now()
FROM help_categories hc WHERE hc.name = 'Getting Started'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Troubleshooting System Performance',
  'When the system feels slow: 1. Check your internet speed (need 10+ Mbps) 2. Clear browser cache monthly 3. Close unused browser tabs 4. Restart browser daily 5. Use Chrome or Firefox for best performance 6. Check for browser updates. Contact support if issues persist after these steps.',
  hc.id,
  '["performance", "troubleshooting", "browser", "speed"]'::jsonb,
  'system',
  189,
  16,
  false,
  6,
  'beginner',
  now()
FROM help_categories hc WHERE hc.name = 'Troubleshooting';

-- Phase 3: Resources Library
CREATE TABLE IF NOT EXISTS help_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('template', 'guide', 'video', 'document', 'integration')),
  file_url TEXT,
  download_count INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE help_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view help resources"
ON help_resources FOR SELECT
USING (true);

INSERT INTO help_resources (title, description, resource_type, category, tags, is_featured) VALUES
('Work Order Template - Basic Service', 'Standard template for oil changes, tire rotations, and basic maintenance', 'template', 'templates', '["work-orders", "maintenance", "template"]'::jsonb, true),
('Work Order Template - Major Repair', 'Comprehensive template for engine, transmission, and major system repairs', 'template', 'templates', '["work-orders", "repairs", "template"]'::jsonb, true),
('Customer Check-in Checklist', 'Ensure consistent service during customer drop-off', 'template', 'templates', '["checklist", "customer-service", "reception"]'::jsonb, false),
('Inventory Audit Spreadsheet', 'Monthly inventory counting and reconciliation template', 'template', 'templates', '["inventory", "audit", "spreadsheet"]'::jsonb, false),
('Setting Up Integrations Guide', 'Step-by-step guide for connecting third-party tools', 'guide', 'integrations', '["integrations", "setup", "api"]'::jsonb, true),
('QuickBooks Integration Guide', 'Connect your accounting system seamlessly', 'guide', 'integrations', '["quickbooks", "accounting", "sync"]'::jsonb, true),
('Parts Supplier Integration', 'Automate parts ordering with major suppliers', 'guide', 'integrations', '["parts", "suppliers", "automation"]'::jsonb, false),
('New Employee Training Checklist', 'Onboarding checklist for new team members', 'template', 'templates', '["training", "onboarding", "hr"]'::jsonb, false);

-- Phase 4: Feature Requests System
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'in_development', 'testing', 'completed', 'rejected', 'on_hold')),
  submitter_name TEXT,
  submitter_email TEXT,
  vote_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public feature requests"
ON feature_requests FOR SELECT
USING (is_public = true);

CREATE POLICY "Authenticated users can create feature requests"
ON feature_requests FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

INSERT INTO feature_requests (title, description, category, priority, status, vote_count, upvotes, is_featured, tags) VALUES
('Mobile App for Technicians', 'Native mobile app for technicians to update work orders from the shop floor without needing a computer', 'mobile', 'high', 'in_development', 47, 47, true, '["mobile", "technicians", "workflow"]'::jsonb),
('Customer Portal', 'Allow customers to view their service history, schedule appointments, and receive estimates online', 'customer_experience', 'high', 'approved', 38, 38, true, '["customer", "portal", "self-service"]'::jsonb),
('Advanced Reporting Dashboard', 'More detailed analytics including profit by technician, service category analysis, and predictive insights', 'reporting', 'medium', 'under_review', 29, 29, false, '["reporting", "analytics", "dashboard"]'::jsonb),
('Automated Follow-up System', 'Automatic email/SMS follow-ups after service completion to gather feedback and promote return visits', 'automation', 'medium', 'submitted', 23, 23, false, '["automation", "follow-up", "marketing"]'::jsonb),
('Multi-location Support', 'Support for shop chains with multiple locations, centralized reporting, and location-specific settings', 'enterprise', 'low', 'submitted', 15, 15, false, '["multi-location", "enterprise", "scaling"]'::jsonb),
('Voice-to-Text Work Notes', 'Allow technicians to add voice notes that are automatically transcribed to text in work orders', 'productivity', 'medium', 'submitted', 12, 12, false, '["voice", "transcription", "notes"]'::jsonb);

-- Enhanced FAQ entries
INSERT INTO help_faqs (question, answer, category, view_count, helpful_count) VALUES 
('How do I backup my data?', 'Your data is automatically backed up daily to secure cloud storage. You can also export reports and customer data anytime from Settings > Data Export. For additional peace of mind, consider our Premium backup service.', 'account_management', 23, 8),
('Can I customize invoice templates?', 'Yes! Go to Settings > Invoice Templates. You can add your logo, customize colors, modify fields, and create different templates for different service types. Changes apply to new invoices immediately.', 'advanced_features', 56, 18),
('How do I handle warranty work?', 'Create a special work order type for warranty. Set labor rates to $0 if covered. Track warranty parts separately. Use the notes section to reference warranty numbers and terms. Generate warranty reports monthly.', 'getting_started', 78, 22),
('What happens if I exceed my user limit?', 'You''ll receive a notification when approaching your limit. Additional users can be added for $25/month each. Contact support to upgrade your plan or temporarily disable inactive users.', 'account_management', 34, 12),
('How do I integrate with my parts suppliers?', 'We support direct integration with major suppliers like NAPA, AutoZone Pro, and O''Reilly. Go to Settings > Integrations to connect your accounts. This enables real-time pricing and automated ordering.', 'advanced_features', 67, 24);

-- Sample notifications for feature updates
CREATE TABLE IF NOT EXISTS help_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'update', 'warning', 'success')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE help_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view help notifications"
ON help_notifications FOR SELECT
USING (auth.role() = 'authenticated');

INSERT INTO help_notifications (title, message, type) VALUES
('New Feature: Customer Portal', 'We''ve launched the customer portal! Your customers can now view service history and schedule appointments online.', 'update'),
('System Maintenance Scheduled', 'Scheduled maintenance this Sunday 2-4 AM EST. Brief service interruption expected.', 'warning'),
('Mobile App Beta Available', 'The technician mobile app is now in beta testing. Contact support to join the program.', 'info');
