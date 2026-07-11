
-- Insert comprehensive help categories for automotive shop management
INSERT INTO help_categories (name, description, icon, sort_order, is_active) VALUES
('Getting Started', 'Essential setup and initial configuration', 'play-circle', 1, true),
('Work Orders', 'Managing service requests and job tracking', 'clipboard-list', 2, true),
('Customer Management', 'Building and maintaining customer relationships', 'users', 3, true),
('Inventory Management', 'Parts tracking and stock control', 'package', 4, true),
('Scheduling & Calendar', 'Appointment and resource planning', 'calendar', 5, true),
('Invoicing & Payments', 'Billing and financial transactions', 'credit-card', 6, true),  
('Reporting & Analytics', 'Business insights and performance metrics', 'bar-chart', 7, true),
('Team Management', 'Staff coordination and roles', 'user-group', 8, true),
('Shop Operations', 'Daily workflow and best practices', 'settings', 9, true),
('Marketing & Growth', 'Customer acquisition and retention', 'trending-up', 10, true);

-- Get category IDs for learning paths (we'll use variables for clarity)
DO $$
DECLARE
    getting_started_id UUID;
    work_orders_id UUID;
    customer_mgmt_id UUID;
    inventory_id UUID;
    scheduling_id UUID;
    invoicing_id UUID;
    reporting_id UUID;
    team_mgmt_id UUID;
    operations_id UUID;
    marketing_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO getting_started_id FROM help_categories WHERE name = 'Getting Started';
    SELECT id INTO work_orders_id FROM help_categories WHERE name = 'Work Orders';
    SELECT id INTO customer_mgmt_id FROM help_categories WHERE name = 'Customer Management';
    SELECT id INTO inventory_id FROM help_categories WHERE name = 'Inventory Management';
    SELECT id INTO scheduling_id FROM help_categories WHERE name = 'Scheduling & Calendar';
    SELECT id INTO invoicing_id FROM help_categories WHERE name = 'Invoicing & Payments';
    SELECT id INTO reporting_id FROM help_categories WHERE name = 'Reporting & Analytics';
    SELECT id INTO team_mgmt_id FROM help_categories WHERE name = 'Team Management';
    SELECT id INTO operations_id FROM help_categories WHERE name = 'Shop Operations';
    SELECT id INTO marketing_id FROM help_categories WHERE name = 'Marketing & Growth';

    -- Insert comprehensive learning paths with real automotive content
    INSERT INTO help_learning_paths (title, description, difficulty_level, estimated_duration, target_role, prerequisites, learning_objectives, completion_reward, is_active) VALUES
    
    -- Shop Owner Fundamentals
    ('Shop Owner Fundamentals', 'Complete guide to setting up and managing your automotive repair shop from day one. Learn essential systems, processes, and best practices for profitable operations.', 'beginner', '8-10 hours', 'Shop Owner', '[]'::jsonb, 
     '["Set up your shop management system", "Create efficient workflows", "Understand key performance metrics", "Implement customer service standards", "Build a foundation for growth"]'::jsonb,
     'Shop Management Certification', true),
    
    -- Service Advisor Mastery  
    ('Service Advisor Mastery', 'Master the art of customer communication, estimate creation, and service sales. Build confidence in handling complex customer interactions and maximizing service revenue.', 'intermediate', '6-8 hours', 'Service Advisor', 
     '["Basic automotive knowledge", "Customer service experience"]'::jsonb,
     '["Excel at customer communication", "Create accurate estimates", "Handle customer objections", "Upsell services effectively", "Manage difficult situations"]'::jsonb,
     'Service Excellence Badge', true),
    
    -- Technician Workflow Optimization
    ('Technician Workflow Optimization', 'Streamline your diagnostic and repair processes using digital tools. Learn time management, quality documentation, and efficient parts handling.', 'intermediate', '4-5 hours', 'Technician',
     '["Basic shop management system familiarity"]'::jsonb,
     '["Optimize diagnostic workflows", "Master digital work orders", "Improve time tracking accuracy", "Document quality repairs", "Streamline parts ordering"]'::jsonb,
     'Efficiency Expert Badge', true),
    
    -- Inventory Management Mastery
    ('Inventory Management Mastery', 'Take control of your parts inventory with smart tracking, automated reordering, and cost optimization strategies. Reduce waste and improve cash flow.', 'advanced', '7-9 hours', 'Shop Owner, Manager',
     '["Basic inventory concepts", "Shop management system access"]'::jsonb,
     '["Implement smart inventory tracking", "Set up automated reorder points", "Optimize vendor relationships", "Reduce carrying costs", "Improve inventory turnover"]'::jsonb,
     'Inventory Optimization Certification', true),
    
    -- Customer Relationship Excellence
    ('Customer Relationship Excellence', 'Build lasting customer relationships through exceptional service, effective communication, and proactive engagement. Turn one-time customers into lifelong advocates.', 'intermediate', '5-6 hours', 'Service Advisor, Reception',
     '["Customer service basics"]'::jsonb,
     '["Build trust with customers", "Handle complaints professionally", "Create loyalty programs", "Follow up effectively", "Generate referrals"]'::jsonb,
     'Customer Champion Badge', true),
    
    -- Shop Operations Excellence
    ('Shop Operations Excellence', 'Optimize daily operations for maximum efficiency and profitability. Learn scheduling, workflow management, and quality control systems.', 'advanced', '8-10 hours', 'Manager, Shop Owner',
     '["Shop management experience", "Team leadership skills"]'::jsonb,
     '["Design efficient workflows", "Optimize resource scheduling", "Implement quality systems", "Manage capacity effectively", "Monitor performance metrics"]'::jsonb,
     'Operations Master Certification', true);

END $$;

-- Clear existing sample articles and insert real automotive help articles
DELETE FROM help_articles WHERE title LIKE '%Sample%' OR title LIKE '%Getting Started%';

-- Insert comprehensive help articles with real content
INSERT INTO help_articles (title, content, category_id, difficulty_level, estimated_read_time, tags, is_featured, is_published) 
SELECT 
    articles.title,
    articles.content,
    cat.id as category_id,
    articles.difficulty_level,
    articles.estimated_read_time,
    articles.tags,
    articles.is_featured,
    true as is_published
FROM help_categories cat
CROSS JOIN (VALUES
    -- Getting Started Articles
    ('Getting Started', 'Setting Up Your Shop Profile', 'Learn how to configure your shop information, operating hours, and contact details to create a professional presence for your customers.

## Shop Information Setup

### Basic Information
- Shop name and DBA information
- Physical address and mailing address
- Phone numbers and email addresses
- Website and social media links

### Operating Hours
- Regular business hours
- Holiday schedules
- Emergency contact procedures
- After-hours policies

### Contact Preferences
- Customer communication methods
- Appointment scheduling preferences
- Reminder and notification settings

### Professional Image
- Logo upload and branding
- Service descriptions
- Certifications and credentials
- Customer testimonials

## Next Steps
Once your profile is complete, you can move on to setting up your service categories and pricing structure.', 'beginner', 8, '["setup", "profile", "configuration"]'::jsonb, true),

    ('Getting Started', 'Understanding Your Dashboard', 'Navigate your shop management dashboard effectively to monitor key metrics, upcoming appointments, and daily operations at a glance.

## Dashboard Overview

### Key Metrics Section
- Daily/weekly/monthly revenue
- Work orders in progress
- Customer satisfaction scores
- Inventory alerts and low stock items

### Quick Actions
- Create new work order
- Schedule appointment
- Add new customer
- Process payment

### Today''s Schedule
- Upcoming appointments
- Technician assignments
- Bay availability
- Priority jobs

### Recent Activity
- New customer inquiries
- Completed work orders
- Payment confirmations
- Team notifications

## Customization Options
Learn how to customize your dashboard widgets to show the information most important to your business operations.', 'beginner', 10, '["dashboard", "navigation", "metrics"]'::jsonb, true),

    -- Work Orders Articles
    ('Work Orders', 'Creating Your First Work Order', 'Step-by-step guide to creating comprehensive work orders that capture all necessary information for efficient service delivery.

## Work Order Basics

### Customer Information
- Verify customer details
- Update contact information
- Review service history
- Note customer preferences

### Vehicle Information
- VIN number and year/make/model
- Mileage reading
- License plate number
- Vehicle condition photos

### Service Description
- Customer complaints
- Initial observations
- Recommended services
- Priority levels

### Authorization Process
- Service estimates
- Customer approval
- Written authorization
- Scope changes

## Best Practices
- Always document customer concerns
- Take before/after photos
- Set realistic timeframes
- Communicate progress updates', 'beginner', 12, '["work-orders", "service", "documentation"]'::jsonb, true),

    ('Work Orders', 'Work Order Lifecycle Management', 'Master the complete work order process from creation to completion, including status updates, progress tracking, and customer communication.

## Work Order Stages

### 1. Initial Creation
- Customer intake process
- Preliminary diagnosis
- Service authorization
- Timeline estimation

### 2. In Progress
- Status updates
- Parts ordering
- Time tracking
- Quality checkpoints

### 3. Completion
- Final inspection
- Customer notification
- Invoice preparation
- Delivery scheduling

### 4. Follow-up
- Customer satisfaction
- Warranty information
- Future service recommendations
- Feedback collection

## Status Management
Learn how to effectively use status codes and notifications to keep everyone informed throughout the service process.', 'intermediate', 15, '["workflow", "lifecycle", "status-management"]'::jsonb, false),

    -- Customer Management Articles
    ('Customer Management', 'Building Customer Profiles', 'Create comprehensive customer profiles that help you deliver personalized service and build lasting relationships.

## Customer Information Management

### Contact Details
- Multiple phone numbers
- Email addresses
- Preferred communication methods
- Emergency contacts

### Vehicle History
- All owned vehicles
- Service history tracking
- Warranty information
- Maintenance schedules

### Preferences & Notes
- Communication preferences
- Service preferences
- Payment methods
- Special instructions

### Relationship Building
- Service anniversaries
- Birthday reminders
- Loyalty program status
- Referral tracking

## Data Quality
Maintain accurate customer information through regular updates and verification processes.', 'beginner', 10, '["customers", "profiles", "crm"]'::jsonb, true),

    ('Customer Management', 'Customer Communication Best Practices', 'Develop effective communication strategies that build trust, set expectations, and create exceptional customer experiences.

## Communication Strategies

### Initial Contact
- Professional greeting
- Active listening techniques
- Needs assessment
- Expectation setting

### Service Updates
- Progress notifications
- Timeline changes
- Additional findings
- Cost adjustments

### Problem Resolution
- Acknowledge concerns
- Investigate thoroughly
- Provide solutions
- Follow up for satisfaction

### Relationship Maintenance
- Regular check-ins
- Service reminders
- Appreciation messages
- Referral requests

## Communication Channels
- Phone conversations
- Text messaging
- Email updates
- In-person discussions

Master each channel for maximum effectiveness in different situations.', 'intermediate', 12, '["communication", "customer-service", "relationships"]'::jsonb, true),

    -- Inventory Management Articles
    ('Inventory Management', 'Setting Up Your Parts Inventory', 'Establish an organized inventory system that tracks parts, manages stock levels, and streamlines ordering processes.

## Inventory Setup

### Parts Categories
- Engine components
- Brake systems
- Electrical parts
- Filters and fluids
- Body parts

### Supplier Management
- Vendor information
- Pricing agreements
- Delivery schedules
- Payment terms

### Stock Organization
- Physical location tracking
- Bin numbers and shelving
- ABC analysis classification
- Fast-moving vs. slow-moving items

### Reorder Management
- Minimum stock levels
- Automatic reorder points
- Economic order quantities
- Lead time considerations

## Best Practices
- Regular cycle counting
- Supplier relationship management
- Cost optimization strategies
- Dead stock management', 'intermediate', 18, '["inventory", "parts", "suppliers", "stock-management"]'::jsonb, false),

    ('Inventory Management', 'Inventory Optimization Strategies', 'Advanced techniques for optimizing inventory levels, reducing costs, and improving cash flow while maintaining service quality.

## Optimization Techniques

### Demand Forecasting
- Historical usage analysis
- Seasonal patterns
- Service trends
- Vehicle population changes

### Cost Management
- Carrying cost analysis
- Ordering cost optimization
- Quantity discounts
- Obsolescence management

### Performance Metrics
- Inventory turnover rates
- Fill rates and stockouts
- Carrying cost percentages
- Service level achievements

### Technology Integration
- Automated reordering
- Vendor integration
- Real-time stock updates
- Performance dashboards

## Advanced Strategies
- Just-in-time ordering
- Vendor managed inventory
- Consignment programs
- Cross-docking opportunities

Implement these strategies gradually to optimize your inventory investment.', 'advanced', 20, '["optimization", "analytics", "cost-management", "automation"]'::jsonb, false)

) AS articles(category_name, title, content, difficulty_level, estimated_read_time, tags, is_featured)
WHERE cat.name = articles.category_name;

-- Link learning paths to sequential articles
DO $$
DECLARE
    shop_owner_path_id UUID;
    service_advisor_path_id UUID;
    technician_path_id UUID;
    inventory_path_id UUID;
    customer_path_id UUID;
    operations_path_id UUID;
BEGIN
    -- Get learning path IDs
    SELECT id INTO shop_owner_path_id FROM help_learning_paths WHERE title = 'Shop Owner Fundamentals';
    SELECT id INTO service_advisor_path_id FROM help_learning_paths WHERE title = 'Service Advisor Mastery';
    SELECT id INTO technician_path_id FROM help_learning_paths WHERE title = 'Technician Workflow Optimization';
    SELECT id INTO inventory_path_id FROM help_learning_paths WHERE title = 'Inventory Management Mastery';
    SELECT id INTO customer_path_id FROM help_learning_paths WHERE title = 'Customer Relationship Excellence';
    SELECT id INTO operations_path_id FROM help_learning_paths WHERE title = 'Shop Operations Excellence';

    -- Update learning paths with linked articles
    UPDATE help_learning_paths 
    SET articles = (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', ha.id,
                'title', ha.title,
                'order', row_number() OVER (ORDER BY ha.title),
                'estimated_read_time', ha.estimated_read_time,
                'difficulty_level', ha.difficulty_level
            )
        )
        FROM help_articles ha
        JOIN help_categories hc ON ha.category_id = hc.id
        WHERE hc.name IN ('Getting Started', 'Work Orders')
    )
    WHERE id = shop_owner_path_id;

    UPDATE help_learning_paths 
    SET articles = (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', ha.id,
                'title', ha.title,
                'order', row_number() OVER (ORDER BY ha.title),
                'estimated_read_time', ha.estimated_read_time,
                'difficulty_level', ha.difficulty_level
            )
        )
        FROM help_articles ha
        JOIN help_categories hc ON ha.category_id = hc.id
        WHERE hc.name = 'Customer Management'
    )
    WHERE id = service_advisor_path_id;

    UPDATE help_learning_paths 
    SET articles = (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', ha.id,
                'title', ha.title,
                'order', row_number() OVER (ORDER BY ha.title),
                'estimated_read_time', ha.estimated_read_time,
                'difficulty_level', ha.difficulty_level
            )
        )
        FROM help_articles ha
        JOIN help_categories hc ON ha.category_id = hc.id
        WHERE hc.name = 'Work Orders'
    )
    WHERE id = technician_path_id;

    UPDATE help_learning_paths 
    SET articles = (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', ha.id,
                'title', ha.title,
                'order', row_number() OVER (ORDER BY ha.title),
                'estimated_read_time', ha.estimated_read_time,
                'difficulty_level', ha.difficulty_level
            )
        )
        FROM help_articles ha
        JOIN help_categories hc ON ha.category_id = hc.id
        WHERE hc.name = 'Inventory Management'
    )
    WHERE id = inventory_path_id;

END $$;
