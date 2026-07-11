
-- Insert comprehensive help categories
INSERT INTO help_categories (name, description, icon, display_order, is_active) VALUES
('Getting Started', 'Essential basics for new users to get up and running quickly', 'play-circle', 1, true),
('Work Orders', 'Complete guide to creating, managing, and completing work orders', 'wrench', 2, true),
('Customer Management', 'Build and maintain strong customer relationships', 'users', 3, true),
('Inventory Management', 'Track parts, manage stock levels, and optimize purchasing', 'package', 4, true),
('Scheduling & Calendar', 'Optimize appointment scheduling and resource allocation', 'calendar', 5, true),
('Invoicing & Payments', 'Process payments and manage billing efficiently', 'credit-card', 6, true),
('Reporting & Analytics', 'Use data to make informed business decisions', 'bar-chart', 7, true),
('Team Management', 'Manage staff, roles, and permissions effectively', 'user-check', 8, true),
('Shop Operations', 'Streamline daily operations and workflows', 'settings', 9, true),
('Marketing & Growth', 'Attract new customers and grow your business', 'trending-up', 10, true);

-- Insert learning paths with comprehensive content
INSERT INTO help_learning_paths (title, description, difficulty_level, estimated_duration, target_role, articles, prerequisites, is_active) VALUES
(
  'Shop Owner Fundamentals',
  'Master the essential skills every auto shop owner needs to run a successful business',
  'beginner',
  '4-6 hours',
  'owner',
  '[]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Service Advisor Mastery',
  'Develop the communication and sales skills to excel as a service advisor',
  'intermediate',
  '3-4 hours',
  'service_advisor',
  '[]'::jsonb,
  '["Shop Owner Fundamentals"]'::jsonb,
  true
),
(
  'Technician Workflow Optimization',
  'Learn digital tools and best practices to maximize efficiency and quality',
  'intermediate',
  '2-3 hours',
  'technician',
  '[]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Inventory Management Mastery',
  'Complete system for managing parts inventory and optimizing costs',
  'advanced',
  '5-6 hours',
  'manager',
  '[]'::jsonb,
  '["Shop Owner Fundamentals"]'::jsonb,
  true
),
(
  'Customer Relationship Excellence',
  'Build lasting relationships that drive loyalty and referrals',
  'intermediate',
  '2-3 hours',
  'service_advisor',
  '[]'::jsonb,
  '[]'::jsonb,
  true
),
(
  'Shop Operations Excellence',
  'Advanced strategies for optimizing shop workflows and performance',
  'advanced',
  '4-5 hours',
  'manager',
  '[]'::jsonb,
  '["Shop Owner Fundamentals", "Inventory Management Mastery"]'::jsonb,
  true
);

-- Insert comprehensive help articles with real automotive content
INSERT INTO help_articles (title, content, category_id, difficulty_level, estimated_read_time, tags, is_featured, is_active) VALUES
-- Getting Started Articles
(
  'Dashboard Overview: Your Command Center',
  'Learn how to navigate your shop management dashboard and understand key metrics at a glance. The dashboard provides real-time insights into work orders, revenue, customer activity, and shop performance. Key sections include: Active Work Orders, Daily Revenue, Customer Status, Inventory Alerts, and Team Performance metrics.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  'beginner',
  8,
  '["dashboard", "overview", "navigation", "metrics"]'::jsonb,
  true,
  true
),
(
  'Setting Up Your Shop Profile',
  'Complete your shop information, business hours, services offered, and contact details. This information appears on customer communications and helps establish your professional brand. Include your shop address, phone numbers, email, website, and business registration details.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  'beginner',
  5,
  '["setup", "profile", "business", "contact"]'::jsonb,
  false,
  true
),
(
  'User Roles and Permissions',
  'Configure team member access levels and permissions. Different roles (Owner, Manager, Service Advisor, Technician, Reception) have specific permissions to ensure security and proper workflow. Learn how to assign roles and customize permissions for your team structure.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started'),
  'beginner',
  6,
  '["users", "roles", "permissions", "security"]'::jsonb,
  false,
  true
),

-- Work Orders Articles
(
  'Creating Your First Work Order',
  'Step-by-step guide to creating work orders from customer check-in to job assignment. Include customer information, vehicle details, service requests, initial diagnosis, and estimated completion time. Learn best practices for accurate documentation and clear communication.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders'),
  'beginner',
  10,
  '["work-orders", "creation", "customer", "vehicle"]'::jsonb,
  true,
  true
),
(
  'Work Order Status Management',
  'Understand and manage work order statuses: Pending, In Progress, Waiting for Parts, Completed, and Invoiced. Learn when to update statuses and how status changes trigger customer notifications and workflow automation.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders'),
  'intermediate',
  7,
  '["work-orders", "status", "workflow", "notifications"]'::jsonb,
  false,
  true
),
(
  'Adding Labor and Parts to Work Orders',
  'Learn how to add labor charges, parts, and materials to work orders. Understand labor rate calculations, parts markup, tax handling, and discount applications. Best practices for accurate cost estimation and transparent pricing.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders'),
  'intermediate',
  12,
  '["work-orders", "labor", "parts", "pricing", "estimates"]'::jsonb,
  false,
  true
),
(
  'Digital Inspection Reports',
  'Create professional digital inspection reports with photos, videos, and detailed findings. Learn how to use inspection templates, capture evidence, and present recommendations to customers in a clear, professional manner.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders'),
  'intermediate',
  9,
  '["inspections", "digital", "photos", "reports", "recommendations"]'::jsonb,
  false,
  true
),

-- Customer Management Articles
(
  'Customer Database Management',
  'Build and maintain a comprehensive customer database with contact information, vehicle history, service preferences, and communication notes. Learn data entry best practices and how to keep customer information current and organized.',
  (SELECT id FROM help_categories WHERE name = 'Customer Management'),
  'beginner',
  8,
  '["customers", "database", "contact", "history"]'::jsonb,
  true,
  true
),
(
  'Vehicle History Tracking',
  'Maintain detailed service records for each customer vehicle including past repairs, maintenance schedules, warranty information, and parts history. Use this data to provide proactive service recommendations and build customer trust.',
  (SELECT id FROM help_categories WHERE name = 'Customer Management'),
  'intermediate',
  10,
  '["vehicles", "history", "maintenance", "records", "warranty"]'::jsonb,
  false,
  true
),
(
  'Customer Communication Best Practices',
  'Develop effective communication strategies for different customer interactions: service updates, estimate approvals, completion notifications, and follow-up calls. Learn tone, timing, and channel preferences for optimal customer experience.',
  (SELECT id FROM help_categories WHERE name = 'Customer Management'),
  'intermediate',
  11,
  '["communication", "customer-service", "notifications", "follow-up"]'::jsonb,
  false,
  true
),

-- Inventory Management Articles
(
  'Parts Inventory Setup',
  'Set up your parts inventory system with proper categorization, supplier information, cost tracking, and reorder points. Learn how to organize parts by category, brand, and frequency of use for efficient workflow.',
  (SELECT id FROM help_categories WHERE name = 'Inventory Management'),
  'intermediate',
  12,
  '["inventory", "parts", "setup", "organization", "suppliers"]'::jsonb,
  true,
  true
),
(
  'Reorder Point Management',
  'Establish optimal reorder points for frequently used parts to avoid stockouts while minimizing carrying costs. Learn how to calculate reorder points based on usage patterns, lead times, and seasonal variations.',
  (SELECT id FROM help_categories WHERE name = 'Inventory Management'),
  'advanced',
  9,
  '["inventory", "reorder", "stock-levels", "optimization"]'::jsonb,
  false,
  true
),
(
  'Vendor Relationship Management',
  'Build strong relationships with parts suppliers, negotiate better terms, and manage multiple vendor accounts. Learn procurement best practices, payment terms negotiation, and supplier performance evaluation.',
  (SELECT id FROM help_categories WHERE name = 'Inventory Management'),
  'intermediate',
  8,
  '["vendors", "suppliers", "procurement", "negotiation"]'::jsonb,
  false,
  true
),

-- Scheduling & Calendar Articles
(
  'Appointment Scheduling Fundamentals',
  'Master the basics of efficient appointment scheduling including time slot management, technician assignments, and customer preferences. Learn how to balance workload and maximize shop productivity.',
  (SELECT id FROM help_categories WHERE name = 'Scheduling & Calendar'),
  'beginner',
  9,
  '["scheduling", "appointments", "calendar", "productivity"]'::jsonb,
  true,
  true
),
(
  'Resource Allocation and Bay Management',
  'Optimize the use of service bays, equipment, and technician time. Learn scheduling strategies that minimize downtime and maximize throughput while maintaining quality service standards.',
  (SELECT id FROM help_categories WHERE name = 'Scheduling & Calendar'),
  'advanced',
  11,
  '["resources", "bays", "equipment", "optimization", "throughput"]'::jsonb,
  false,
  true
),

-- Invoicing & Payments Articles
(
  'Invoice Creation and Management',
  'Create professional invoices with detailed line items, tax calculations, and payment terms. Learn invoice templates, automatic numbering, and integration with work orders for seamless billing processes.',
  (SELECT id FROM help_categories WHERE name = 'Invoicing & Payments'),
  'beginner',
  10,
  '["invoicing", "billing", "payments", "templates"]'::jsonb,
  true,
  true
),
(
  'Payment Processing and Records',
  'Handle various payment methods including cash, credit cards, checks, and financing options. Maintain accurate payment records and handle partial payments, refunds, and warranty claims professionally.',
  (SELECT id FROM help_categories WHERE name = 'Invoicing & Payments'),
  'intermediate',
  8,
  '["payments", "processing", "records", "financing", "refunds"]'::jsonb,
  false,
  true
),

-- Reporting & Analytics Articles
(
  'Financial Reports and KPIs',
  'Generate and interpret key financial reports including revenue, profit margins, cost analysis, and cash flow. Understand key performance indicators that drive shop profitability and growth.',
  (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'),
  'intermediate',
  13,
  '["reports", "financial", "kpi", "profitability", "analytics"]'::jsonb,
  true,
  true
),
(
  'Customer Analytics and Insights',
  'Analyze customer behavior patterns, service frequency, lifetime value, and retention rates. Use data insights to improve customer experience and identify opportunities for business growth.',
  (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics'),
  'advanced',
  12,
  '["analytics", "customers", "behavior", "retention", "insights"]'::jsonb,
  false,
  true
),

-- Team Management Articles
(
  'Staff Performance Management',
  'Set performance goals, track productivity metrics, and provide constructive feedback to team members. Learn effective management techniques for different personality types and skill levels in your shop.',
  (SELECT id FROM help_categories WHERE name = 'Team Management'),
  'intermediate',
  10,
  '["staff", "performance", "management", "goals", "feedback"]'::jsonb,
  true,
  true
),
(
  'Training and Development Programs',
  'Create ongoing training programs to keep your team updated on new technologies, techniques, and customer service skills. Develop career progression paths and certification tracking systems.',
  (SELECT id FROM help_categories WHERE name = 'Team Management'),
  'advanced',
  11,
  '["training", "development", "skills", "certification", "career"]'::jsonb,
  false,
  true
),

-- Shop Operations Articles
(
  'Workflow Optimization Strategies',
  'Design efficient workflows that minimize waste, reduce cycle times, and improve quality. Learn lean principles applied to automotive service operations and continuous improvement methodologies.',
  (SELECT id FROM help_categories WHERE name = 'Shop Operations'),
  'advanced',
  14,
  '["workflow", "optimization", "lean", "efficiency", "quality"]'::jsonb,
  true,
  true
),
(
  'Quality Control Systems',
  'Implement quality control checkpoints throughout your service process to ensure consistent, high-quality work. Develop inspection procedures, customer satisfaction surveys, and corrective action protocols.',
  (SELECT id FROM help_categories WHERE name = 'Shop Operations'),
  'intermediate',
  9,
  '["quality", "control", "inspection", "satisfaction", "procedures"]'::jsonb,
  false,
  true
),

-- Marketing & Growth Articles
(
  'Customer Retention Strategies',
  'Develop programs to keep customers coming back including loyalty programs, service reminders, and personalized marketing. Learn the economics of customer retention versus new customer acquisition.',
  (SELECT id FROM help_categories WHERE name = 'Marketing & Growth'),
  'intermediate',
  10,
  '["retention", "loyalty", "marketing", "reminders", "growth"]'::jsonb,
  true,
  true
),
(
  'Digital Marketing for Auto Shops',
  'Leverage online marketing channels including social media, Google My Business, email marketing, and review management to attract new customers and build your brand presence in the community.',
  (SELECT id FROM help_categories WHERE name = 'Marketing & Growth'),
  'intermediate',
  12,
  '["digital-marketing", "social-media", "reviews", "branding", "online"]'::jsonb,
  false,
  true
);

-- Update learning paths with article references
UPDATE help_learning_paths 
SET articles = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ha.id,
      'title', ha.title,
      'order', ROW_NUMBER() OVER (ORDER BY ha.created_at)
    )
  )
  FROM help_articles ha
  WHERE ha.title IN (
    'Dashboard Overview: Your Command Center',
    'Setting Up Your Shop Profile',
    'User Roles and Permissions',
    'Creating Your First Work Order',
    'Customer Database Management',
    'Parts Inventory Setup',
    'Appointment Scheduling Fundamentals',
    'Invoice Creation and Management',
    'Financial Reports and KPIs',
    'Staff Performance Management',
    'Workflow Optimization Strategies',
    'Customer Retention Strategies'
  )
)
WHERE title = 'Shop Owner Fundamentals';

UPDATE help_learning_paths 
SET articles = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ha.id,
      'title', ha.title,
      'order', ROW_NUMBER() OVER (ORDER BY ha.created_at)
    )
  )
  FROM help_articles ha
  WHERE ha.title IN (
    'Customer Communication Best Practices',
    'Work Order Status Management',
    'Adding Labor and Parts to Work Orders',
    'Digital Inspection Reports',
    'Vehicle History Tracking',
    'Payment Processing and Records',
    'Customer Analytics and Insights',
    'Quality Control Systems'
  )
)
WHERE title = 'Service Advisor Mastery';

UPDATE help_learning_paths 
SET articles = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ha.id,
      'title', ha.title,
      'order', ROW_NUMBER() OVER (ORDER BY ha.created_at)
    )
  )
  FROM help_articles ha
  WHERE ha.title IN (
    'Creating Your First Work Order',
    'Digital Inspection Reports',
    'Work Order Status Management',
    'Adding Labor and Parts to Work Orders',
    'Quality Control Systems',
    'Parts Inventory Setup'
  )
)
WHERE title = 'Technician Workflow Optimization';

UPDATE help_learning_paths 
SET articles = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ha.id,
      'title', ha.title,
      'order', ROW_NUMBER() OVER (ORDER BY ha.created_at)
    )
  )
  FROM help_articles ha
  WHERE ha.title IN (
    'Parts Inventory Setup',
    'Reorder Point Management',
    'Vendor Relationship Management',
    'Resource Allocation and Bay Management',
    'Financial Reports and KPIs',
    'Customer Analytics and Insights',
    'Workflow Optimization Strategies',
    'Invoice Creation and Management',
    'Payment Processing and Records',
    'Quality Control Systems'
  )
)
WHERE title = 'Inventory Management Mastery';

UPDATE help_learning_paths 
SET articles = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ha.id,
      'title', ha.title,
      'order', ROW_NUMBER() OVER (ORDER BY ha.created_at)
    )
  )
  FROM help_articles ha
  WHERE ha.title IN (
    'Customer Communication Best Practices',
    'Customer Database Management',
    'Vehicle History Tracking',
    'Customer Retention Strategies',
    'Digital Marketing for Auto Shops',
    'Customer Analytics and Insights',
    'Quality Control Systems'
  )
)
WHERE title = 'Customer Relationship Excellence';

UPDATE help_learning_paths 
SET articles = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ha.id,
      'title', ha.title,
      'order', ROW_NUMBER() OVER (ORDER BY ha.created_at)
    )
  )
  FROM help_articles ha
  WHERE ha.title IN (
    'Workflow Optimization Strategies',
    'Resource Allocation and Bay Management',
    'Staff Performance Management',
    'Training and Development Programs',
    'Quality Control Systems',
    'Financial Reports and KPIs',
    'Customer Analytics and Insights',
    'Appointment Scheduling Fundamentals',
    'Digital Marketing for Auto Shops'
  )
)
WHERE title = 'Shop Operations Excellence';
