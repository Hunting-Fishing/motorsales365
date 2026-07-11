-- Populate help categories with repair shop relevant categories
INSERT INTO help_categories (name, description, icon, sort_order, is_active) VALUES
('Getting Started', 'Essential guides to help you get started with your repair shop management', 'BookOpen', 1, true),
('Customer Management', 'Learn how to effectively manage customer relationships and communications', 'Users', 2, true),
('Inventory Control', 'Master inventory tracking, ordering, and stock management', 'Package', 3, true),
('Service Management', 'Optimize your service operations and workflow', 'Settings', 4, true),
('Financial Management', 'Understand reporting, accounting, and financial tracking', 'DollarSign', 5, true),
('Staff Management', 'Employee scheduling, roles, and team coordination', 'UserCheck', 6, true),
('Equipment & Tools', 'Managing shop equipment, tools, and maintenance schedules', 'Wrench', 7, true),
('Quality Control', 'Ensuring consistent service quality and customer satisfaction', 'CheckCircle', 8, true),
('Marketing & Growth', 'Growing your business through effective marketing strategies', 'TrendingUp', 9, true),
('Troubleshooting', 'Common issues and how to resolve them quickly', 'AlertTriangle', 10, true);

-- Populate help_learning_paths with comprehensive repair shop learning journeys
INSERT INTO help_learning_paths (title, description, difficulty_level, estimated_duration, target_role, articles, prerequisites, is_active) VALUES
('New Shop Owner Fundamentals', 'Complete guide for new repair shop owners covering all essential business operations from setup to daily management', 'beginner', '4-6 hours', 'Owner/Manager', '["getting-started-basics", "customer-onboarding", "inventory-setup", "service-workflow", "basic-financial-tracking"]', '[]', true),

('Customer Service Excellence', 'Master customer relationship management, communication strategies, and building long-term customer loyalty', 'intermediate', '3-4 hours', 'Service Advisor/Reception', '["customer-communication", "handling-complaints", "upselling-techniques", "follow-up-strategies"]', '["getting-started-basics"]', true),

('Advanced Inventory Management', 'Deep dive into sophisticated inventory control, supplier relationships, and cost optimization strategies', 'advanced', '5-7 hours', 'Manager/Inventory Specialist', '["advanced-inventory-tracking", "supplier-management", "cost-analysis", "automated-reordering"]', '["inventory-setup", "basic-financial-tracking"]', true),

('Financial Mastery for Repair Shops', 'Comprehensive financial management including budgeting, cost analysis, profitability optimization, and tax preparation', 'intermediate', '6-8 hours', 'Owner/Accountant', '["financial-reporting", "cost-analysis", "budget-planning", "tax-preparation", "profitability-analysis"]', '["basic-financial-tracking"]', true),

('Team Leadership & Staff Development', 'Build and manage high-performing teams with effective leadership, training programs, and performance management', 'intermediate', '4-5 hours', 'Manager/Owner', '["staff-scheduling", "performance-management", "training-programs", "team-communication"]', '["getting-started-basics"]', true),

('Digital Marketing for Auto Repair', 'Modern marketing strategies including social media, online reviews, email campaigns, and local SEO', 'beginner', '3-4 hours', 'Marketing/Owner', '["social-media-marketing", "review-management", "email-campaigns", "local-seo"]', '[]', true);

-- Populate help_resources with practical tools and templates
INSERT INTO help_resources (title, description, resource_type, file_url, download_url, category_id, tags, is_active, download_count) VALUES
('Customer Intake Form Template', 'Comprehensive customer information form including vehicle details, contact info, and service history tracking', 'template', '/resources/templates/customer-intake-form.pdf', '/api/download/customer-intake-form', (SELECT id FROM help_categories WHERE name = 'Customer Management'), '["template", "customer", "intake", "form"]', true, 0),

('Daily Service Checklist', 'Standardized checklist for daily shop operations ensuring nothing gets overlooked', 'template', '/resources/templates/daily-service-checklist.pdf', '/api/download/daily-checklist', (SELECT id FROM help_categories WHERE name = 'Service Management'), '["checklist", "daily", "operations", "template"]', true, 0),

('Inventory Tracking Spreadsheet', 'Excel template for tracking parts inventory, reorder points, and supplier information', 'template', '/resources/templates/inventory-tracking.xlsx', '/api/download/inventory-template', (SELECT id FROM help_categories WHERE name = 'Inventory Control'), '["inventory", "tracking", "spreadsheet", "template"]', true, 0),

('Cost Estimation Calculator', 'Interactive tool for calculating service costs including labor, parts, and markup', 'calculator', '/tools/cost-calculator', null, (SELECT id FROM help_categories WHERE name = 'Financial Management'), '["calculator", "pricing", "cost", "tool"]', true, 0),

('Employee Handbook Template', 'Comprehensive employee handbook template covering policies, procedures, and expectations', 'template', '/resources/templates/employee-handbook.docx', '/api/download/employee-handbook', (SELECT id FROM help_categories WHERE name = 'Staff Management'), '["handbook", "employee", "policies", "template"]', true, 0),

('Safety Inspection Checklist', 'Monthly safety inspection checklist for shop equipment and work areas', 'template', '/resources/templates/safety-checklist.pdf', '/api/download/safety-checklist', (SELECT id FROM help_categories WHERE name = 'Equipment & Tools'), '["safety", "inspection", "checklist", "template"]', true, 0),

('Customer Satisfaction Survey', 'Template for gathering customer feedback and measuring service satisfaction', 'template', '/resources/templates/satisfaction-survey.pdf', '/api/download/satisfaction-survey', (SELECT id FROM help_categories WHERE name = 'Quality Control'), '["survey", "feedback", "satisfaction", "template"]', true, 0),

('Marketing Campaign Planner', 'Step-by-step guide for planning and executing marketing campaigns', 'template', '/resources/templates/marketing-planner.pdf', '/api/download/marketing-planner', (SELECT id FROM help_categories WHERE name = 'Marketing & Growth'), '["marketing", "campaign", "planner", "template"]', true, 0),

('Troubleshooting Quick Reference', 'Common system issues and their solutions for quick problem resolution', 'document', '/resources/guides/troubleshooting-guide.pdf', '/api/download/troubleshooting-guide', (SELECT id FROM help_categories WHERE name = 'Troubleshooting'), '["troubleshooting", "reference", "guide", "solutions"]', true, 0),

('Financial Dashboard Setup Video', 'Video tutorial showing how to set up and customize your financial dashboard', 'video', 'https://www.youtube.com/watch?v=financial-dashboard-setup', null, (SELECT id FROM help_categories WHERE name = 'Financial Management'), '["video", "tutorial", "dashboard", "setup"]', true, 0);

-- Update help_articles with more comprehensive content
UPDATE help_articles SET 
  summary = 'Learn the fundamental concepts and basic setup procedures to get your repair shop management system running smoothly',
  content = 'This comprehensive guide walks you through the essential first steps of setting up your repair shop management system. Topics covered include initial account setup, basic configuration, understanding the dashboard, and performing your first transactions.',
  difficulty_level = 'beginner',
  estimated_read_time = 8,
  tags = '["setup", "basics", "getting-started", "beginner"]',
  is_featured = true,
  category_id = (SELECT id FROM help_categories WHERE name = 'Getting Started')
WHERE title = 'Getting Started with Your Repair Shop Management System';

UPDATE help_articles SET 
  summary = 'Master effective customer communication strategies to build trust and ensure customer satisfaction',
  content = 'Effective customer communication is crucial for repair shop success. This guide covers best practices for initial consultations, explaining technical issues in layman terms, setting expectations, and maintaining positive relationships throughout the service process.',
  difficulty_level = 'intermediate',
  estimated_read_time = 12,
  tags = '["communication", "customer-service", "relationship", "satisfaction"]',
  is_featured = true,
  category_id = (SELECT id FROM help_categories WHERE name = 'Customer Management')
WHERE title = 'Effective Customer Communication Strategies';

UPDATE help_articles SET 
  summary = 'Implement robust inventory tracking systems to minimize costs and prevent stockouts',
  content = 'Proper inventory management is essential for profitability. Learn how to set up automated tracking, establish reorder points, manage supplier relationships, and optimize stock levels to reduce carrying costs while ensuring parts availability.',
  difficulty_level = 'intermediate',
  estimated_read_time = 15,
  tags = '["inventory", "tracking", "automation", "suppliers", "cost-control"]',
  is_featured = false,
  category_id = (SELECT id FROM help_categories WHERE name = 'Inventory Control')
WHERE title = 'Advanced Inventory Tracking and Management';

UPDATE help_articles SET 
  summary = 'Understand key financial metrics and create actionable reports to drive business decisions',
  content = 'Financial reporting provides critical insights into your business performance. This guide explains how to interpret key metrics like gross margin, labor efficiency, and customer acquisition costs, plus how to create reports that inform strategic decisions.',
  difficulty_level = 'advanced',
  estimated_read_time = 20,
  tags = '["financial", "reporting", "metrics", "analysis", "kpi"]',
  is_featured = false,
  category_id = (SELECT id FROM help_categories WHERE name = 'Financial Management')
WHERE title = 'Financial Reporting and Analytics Guide';