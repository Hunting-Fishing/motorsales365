
-- First, clear any existing data to ensure clean state
DELETE FROM help_articles;
DELETE FROM help_learning_paths;
DELETE FROM help_categories;

-- Add missing columns to help_learning_paths if they don't exist
ALTER TABLE help_learning_paths ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]'::jsonb;
ALTER TABLE help_learning_paths ADD COLUMN IF NOT EXISTS completion_reward TEXT;

-- Insert help categories with proper ordering
INSERT INTO help_categories (id, name, description, icon, display_order, is_active) VALUES
(gen_random_uuid(), 'Getting Started', 'Essential basics for new users to get up and running quickly', 'play-circle', 1, true),
(gen_random_uuid(), 'Work Orders', 'Complete guide to creating, managing, and completing work orders', 'wrench', 2, true),
(gen_random_uuid(), 'Customer Management', 'Build and maintain strong customer relationships', 'users', 3, true),
(gen_random_uuid(), 'Inventory Management', 'Track parts, manage stock levels, and optimize purchasing', 'package', 4, true),
(gen_random_uuid(), 'Scheduling & Calendar', 'Optimize appointment scheduling and resource allocation', 'calendar', 5, true),
(gen_random_uuid(), 'Invoicing & Payments', 'Process payments and manage billing efficiently', 'credit-card', 6, true),
(gen_random_uuid(), 'Reporting & Analytics', 'Use data to make informed business decisions', 'bar-chart', 7, true),
(gen_random_uuid(), 'Team Management', 'Manage staff, roles, and permissions effectively', 'user-check', 8, true),
(gen_random_uuid(), 'Shop Operations', 'Streamline daily operations and workflows', 'settings', 9, true),
(gen_random_uuid(), 'Marketing & Growth', 'Attract new customers and grow your business', 'trending-up', 10, true);

-- Insert learning paths
INSERT INTO help_learning_paths (id, title, description, difficulty_level, estimated_duration, target_role, articles, prerequisites, learning_objectives, completion_reward, is_active) VALUES
(
  gen_random_uuid(),
  'Shop Owner Fundamentals',
  'Master the essential skills every auto shop owner needs to run a successful business',
  'beginner',
  '4-6 hours',
  'owner',
  '[]'::jsonb,
  '[]'::jsonb,
  '["Understand dashboard navigation", "Set up shop profile", "Configure user roles", "Create first work order", "Manage customer database"]'::jsonb,
  'Shop Owner Certification Badge',
  true
),
(
  gen_random_uuid(),
  'Service Advisor Mastery',
  'Develop the communication and sales skills to excel as a service advisor',
  'intermediate',
  '3-4 hours',
  'service_advisor',
  '[]'::jsonb,
  '["Shop Owner Fundamentals"]'::jsonb,
  '["Master customer communication", "Handle work order updates", "Create digital inspections", "Process payments"]'::jsonb,
  'Service Excellence Certification',
  true
),
(
  gen_random_uuid(),
  'Technician Workflow Optimization',
  'Learn digital tools and best practices to maximize efficiency and quality',
  'intermediate',
  '2-3 hours',
  'technician',
  '[]'::jsonb,
  '[]'::jsonb,
  '["Use digital work orders", "Create inspection reports", "Update job status", "Manage quality control"]'::jsonb,
  'Workflow Expert Badge',
  true
),
(
  gen_random_uuid(),
  'Inventory Management Mastery',
  'Complete system for managing parts inventory and optimizing costs',
  'advanced',
  '5-6 hours',
  'manager',
  '[]'::jsonb,
  '["Shop Owner Fundamentals"]'::jsonb,
  '["Set up inventory system", "Manage reorder points", "Handle vendor relationships", "Optimize costs"]'::jsonb,
  'Inventory Master Certification',
  true
),
(
  gen_random_uuid(),
  'Customer Relationship Excellence',
  'Build lasting relationships that drive loyalty and referrals',
  'intermediate',
  '2-3 hours',
  'service_advisor',
  '[]'::jsonb,
  '[]'::jsonb,
  '["Develop communication skills", "Track customer history", "Implement retention strategies", "Handle complaints"]'::jsonb,
  'Customer Champion Badge',
  true
),
(
  gen_random_uuid(),
  'Shop Operations Excellence',
  'Advanced strategies for optimizing shop workflows and performance',
  'advanced',
  '4-5 hours',
  'manager',
  '[]'::jsonb,
  '["Shop Owner Fundamentals", "Inventory Management Mastery"]'::jsonb,
  '["Optimize workflows", "Manage resources", "Lead teams", "Implement quality systems"]'::jsonb,
  'Operations Master Certification',
  true
);

-- Insert help articles with proper category references
INSERT INTO help_articles (title, content, category_id, difficulty_level, estimated_read_time, tags, is_featured, is_active) VALUES
-- Getting Started Articles
(
  'Dashboard Overview: Your Command Center',
  'Learn how to navigate your shop management dashboard and understand key metrics at a glance. The dashboard provides real-time insights into work orders, revenue, customer activity, and shop performance. Key sections include: Active Work Orders showing current jobs in progress, Daily Revenue displaying financial performance, Customer Status tracking service appointments, Inventory Alerts for low stock items, and Team Performance metrics measuring productivity. Use the quick action buttons to create new work orders, schedule appointments, or access frequently used features.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started' LIMIT 1),
  'beginner',
  8,
  '["dashboard", "overview", "navigation", "metrics"]'::jsonb,
  true,
  true
),
(
  'Setting Up Your Shop Profile',
  'Complete your shop information to establish your professional brand and ensure accurate customer communications. Navigate to Settings > Shop Profile to enter your business name, address, phone numbers, email, and website. Add your business hours, services offered, and specializations. Upload your shop logo and set your brand colors. Include business registration details, certifications, and insurance information. This information appears on invoices, estimates, and customer communications.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started' LIMIT 1),
  'beginner',
  5,
  '["setup", "profile", "business", "contact"]'::jsonb,
  false,
  true
),
(
  'User Roles and Permissions',
  'Configure team member access levels to ensure security and proper workflow. Go to Settings > Team Management to assign roles: Owner (full access), Manager (operations management), Service Advisor (customer interaction), Technician (work order execution), Reception (appointment scheduling). Each role has specific permissions for viewing, creating, and modifying data. Customize permissions as needed for your shop structure.',
  (SELECT id FROM help_categories WHERE name = 'Getting Started' LIMIT 1),
  'beginner',
  6,
  '["users", "roles", "permissions", "security"]'::jsonb,
  false,
  true
),

-- Work Orders Articles
(
  'Creating Your First Work Order',
  'Master the work order creation process from customer check-in to job assignment. Start by clicking "New Work Order" and entering customer information. Add vehicle details including VIN, mileage, and any visible damage. Document the customer concerns clearly and specify requested services. Assign the work order to available technicians and set estimated completion time. Include initial diagnosis notes and any special instructions. Save and notify the assigned technician.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders' LIMIT 1),
  'beginner',
  10,
  '["work-orders", "creation", "customer", "vehicle"]'::jsonb,
  true,
  true
),
(
  'Work Order Status Management',
  'Understand and effectively manage work order statuses throughout the service process. Statuses include: Pending (awaiting technician assignment), In Progress (actively being worked), Waiting for Parts (parts ordered), Quality Check (work completed, awaiting inspection), Customer Approval (estimate approval needed), Completed (work finished), and Invoiced (billed to customer). Status changes trigger automatic customer notifications and update workflow dashboards.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders' LIMIT 1),
  'intermediate',
  7,
  '["work-orders", "status", "workflow", "notifications"]'::jsonb,
  false,
  true
),
(
  'Adding Labor and Parts to Work Orders',
  'Learn to accurately add labor charges, parts, and materials to work orders. Use the labor section to add service tasks with time estimates and hourly rates. Add parts by searching your inventory or creating new part entries. Apply appropriate markup percentages and handle tax calculations. Include core charges, environmental fees, and shop supplies. Apply discounts when appropriate and ensure all charges are clearly documented for customer transparency.',
  (SELECT id FROM help_categories WHERE name = 'Work Orders' LIMIT 1),
  'intermediate',
  12,
  '["work-orders", "labor", "parts", "pricing", "estimates"]'::jsonb,
  false,
  true
),

-- Customer Management Articles
(
  'Customer Database Management',
  'Build and maintain a comprehensive customer database for improved service and communication. Create detailed customer profiles with contact information, service preferences, and communication history. Track vehicle ownership history and service patterns. Maintain emergency contacts and preferred appointment times. Use customer tags for grouping and targeted marketing. Regular database cleanup ensures accuracy and GDPR compliance.',
  (SELECT id FROM help_categories WHERE name = 'Customer Management' LIMIT 1),
  'beginner',
  8,
  '["customers", "database", "contact", "history"]'::jsonb,
  true,
  true
),
(
  'Vehicle History Tracking',
  'Maintain detailed service records for each customer vehicle to provide proactive service recommendations. Record all services performed, parts replaced, and warranty information. Track maintenance schedules based on mileage and time intervals. Document recurring issues and resolutions. Use this history to recommend preventive maintenance and identify potential future repairs. Share service history with customers to build trust and transparency.',
  (SELECT id FROM help_categories WHERE name = 'Customer Management' LIMIT 1),
  'intermediate',
  10,
  '["vehicles", "history", "maintenance", "records", "warranty"]'::jsonb,
  false,
  true
),

-- Inventory Management Articles
(
  'Parts Inventory Setup',
  'Establish an organized parts inventory system for efficient operations. Categorize parts by system (engine, transmission, brakes, etc.) and frequency of use. Set up supplier relationships with contact information and payment terms. Configure reorder points based on usage patterns and lead times. Implement barcode scanning for quick part identification. Track part costs, markup percentages, and profit margins for accurate pricing.',
  (SELECT id FROM help_categories WHERE name = 'Inventory Management' LIMIT 1),
  'intermediate',
  12,
  '["inventory", "parts", "setup", "organization", "suppliers"]'::jsonb,
  true,
  true
),
(
  'Reorder Point Management',
  'Optimize inventory levels by setting intelligent reorder points for parts. Calculate reorder points based on average usage, lead time, and safety stock requirements. Monitor fast-moving parts weekly and slow-moving parts monthly. Consider seasonal variations and promotional periods. Set up automatic alerts when parts reach reorder levels. Review and adjust reorder points quarterly based on actual usage patterns.',
  (SELECT id FROM help_categories WHERE name = 'Inventory Management' LIMIT 1),
  'advanced',
  9,
  '["inventory", "reorder", "stock-levels", "optimization"]'::jsonb,
  false,
  true
),

-- Additional core articles for other categories
(
  'Appointment Scheduling Fundamentals',
  'Master efficient appointment scheduling to maximize shop productivity and customer satisfaction. Use time slot templates based on service types and technician skills. Balance workload across team members and service bays. Allow buffer time for unexpected delays and emergency services. Implement customer self-scheduling for routine maintenance. Send automatic appointment reminders and confirmations.',
  (SELECT id FROM help_categories WHERE name = 'Scheduling & Calendar' LIMIT 1),
  'beginner',
  9,
  '["scheduling", "appointments", "calendar", "productivity"]'::jsonb,
  true,
  true
),
(
  'Invoice Creation and Management',
  'Create professional invoices that clearly communicate value and facilitate prompt payment. Use standardized invoice templates with your shop branding. Include detailed line items for labor, parts, and additional services. Apply appropriate taxes and fees. Offer multiple payment options including financing when available. Set up automatic payment reminders for overdue accounts.',
  (SELECT id FROM help_categories WHERE name = 'Invoicing & Payments' LIMIT 1),
  'beginner',
  10,
  '["invoicing", "billing", "payments", "templates"]'::jsonb,
  true,
  true
),
(
  'Financial Reports and KPIs',
  'Generate and interpret financial reports to make data-driven business decisions. Key reports include daily sales summaries, monthly profit and loss statements, inventory turnover analysis, and customer lifetime value reports. Monitor KPIs such as average repair order value, labor efficiency, parts margin, and customer retention rates. Use trend analysis to identify opportunities for improvement.',
  (SELECT id FROM help_categories WHERE name = 'Reporting & Analytics' LIMIT 1),
  'intermediate',
  13,
  '["reports", "financial", "kpi", "profitability", "analytics"]'::jsonb,
  true,
  true
),
(
  'Staff Performance Management',
  'Develop effective strategies for managing and motivating your team. Set clear performance expectations and provide regular feedback. Track productivity metrics such as labor hours billed, quality scores, and customer satisfaction ratings. Implement recognition programs for outstanding performance. Address performance issues promptly and professionally. Create development plans for career advancement.',
  (SELECT id FROM help_categories WHERE name = 'Team Management' LIMIT 1),
  'intermediate',
  10,
  '["staff", "performance", "management", "goals", "feedback"]'::jsonb,
  true,
  true
),
(
  'Workflow Optimization Strategies',
  'Design efficient workflows that minimize waste and maximize productivity. Map current processes to identify bottlenecks and inefficiencies. Implement lean principles such as 5S organization and continuous improvement. Standardize procedures for common services. Use technology to automate repetitive tasks. Regularly review and refine workflows based on performance data.',
  (SELECT id FROM help_categories WHERE name = 'Shop Operations' LIMIT 1),
  'advanced',
  14,
  '["workflow", "optimization", "lean", "efficiency", "quality"]'::jsonb,
  true,
  true
),
(
  'Customer Retention Strategies',
  'Develop comprehensive strategies to keep customers coming back and increase their lifetime value. Implement loyalty programs with service milestones and rewards. Send personalized service reminders based on vehicle maintenance schedules. Follow up after service to ensure satisfaction and address any concerns. Create referral incentive programs. Use customer feedback to continuously improve service quality.',
  (SELECT id FROM help_categories WHERE name = 'Marketing & Growth' LIMIT 1),
  'intermediate',
  10,
  '["retention", "loyalty", "marketing", "reminders", "growth"]'::jsonb,
  true,
  true
);
