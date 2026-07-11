
-- Fix learning paths data and add realistic content
INSERT INTO help_learning_paths (
  id, title, description, difficulty_level, estimated_duration, target_role, 
  prerequisites, learning_objectives, completion_reward, is_active,
  estimated_minutes, articles_count
) VALUES 
(
  gen_random_uuid(),
  'Getting Started with Shop Management',
  'Learn the fundamentals of managing your automotive shop efficiently',
  'beginner',
  '2-3 hours',
  'Shop Owner',
  '[]'::jsonb,
  '["Understand basic shop operations", "Learn customer management", "Master work order basics", "Set up your dashboard"]'::jsonb,
  'Shop Management Basics Certificate',
  true,
  180,
  4
),
(
  gen_random_uuid(),  
  'Advanced Inventory Management',
  'Master inventory tracking, ordering, and optimization strategies',
  'intermediate',
  '4-5 hours', 
  'Shop Manager',
  '["Basic shop operations knowledge"]'::jsonb,
  '["Optimize inventory levels", "Automate reordering", "Track part usage", "Manage supplier relationships"]'::jsonb,
  'Inventory Expert Badge',
  true,
  300,
  6
),
(
  gen_random_uuid(),
  'Customer Service Excellence',
  'Deliver exceptional customer experiences and build loyalty',
  'beginner',
  '3-4 hours',
  'Service Advisor',
  '[]'::jsonb,
  '["Improve communication skills", "Handle difficult situations", "Build customer relationships", "Increase satisfaction scores"]'::jsonb,
  'Customer Champion Certificate',
  true,
  240,
  5
),
(
  gen_random_uuid(),
  'Financial Management for Auto Shops',
  'Understand profit margins, cash flow, and financial reporting',
  'advanced',
  '6-8 hours',
  'Shop Owner',
  '["Basic accounting knowledge", "Shop management experience"]'::jsonb,
  '["Analyze financial reports", "Improve profit margins", "Manage cash flow", "Plan for growth"]'::jsonb,
  'Financial Manager Certification',
  true,
  450,
  8
);

-- Add realistic help articles and properly categorize them
INSERT INTO help_articles (
  id, title, content, category_id, tags, author_id, views, helpful_count,
  is_featured, estimated_read_time, difficulty_level, last_updated
)
SELECT 
  gen_random_uuid(),
  'How to Create Your First Work Order',
  'Creating work orders is fundamental to shop operations. Here''s a step-by-step guide: 1. Navigate to Work Orders section 2. Click "New Work Order" 3. Select customer and vehicle 4. Add service details 5. Assign technician 6. Set priority and timeline. Pro tip: Use templates for common services to save time.',
  hc.id,
  '["work-orders", "getting-started", "basics"]'::jsonb,
  'system',
  245,
  18,
  true,
  5,
  'beginner',
  now()
FROM help_categories hc WHERE hc.name = 'Getting Started'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Managing Customer Information',
  'Proper customer management ensures smooth operations: 1. Always verify customer contact information 2. Keep vehicle history updated 3. Set up service reminders 4. Track customer preferences 5. Maintain communication logs. This helps build lasting relationships.',
  hc.id,
  '["customers", "crm", "relationships"]'::jsonb,
  'system',
  189,
  22,
  true,
  4,
  'beginner',
  now()
FROM help_categories hc WHERE hc.name = 'Getting Started'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Setting Up Inventory Categories',
  'Organize your inventory effectively: 1. Create main categories (Engine, Brakes, Electrical, etc.) 2. Add subcategories for specificity 3. Set reorder points for each item 4. Configure supplier information 5. Enable low-stock alerts. Good organization saves time and prevents stockouts.',
  hc.id,
  '["inventory", "organization", "setup"]'::jsonb,
  'system',
  156,
  14,
  false,
  6,
  'intermediate',
  now()
FROM help_categories hc WHERE hc.name = 'Advanced Features'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Troubleshooting Login Issues',
  'Can''t access your account? Try these steps: 1. Clear browser cache and cookies 2. Check your internet connection 3. Verify your email and password 4. Try incognito/private browsing mode 5. Reset your password if needed. Contact support if issues persist.',
  hc.id,
  '["login", "troubleshooting", "access"]'::jsonb,
  'system',
  312,
  28,
  false,
  3,
  'beginner',
  now()
FROM help_categories hc WHERE hc.name = 'Troubleshooting'
UNION ALL
SELECT 
  gen_random_uuid(),
  'Understanding User Roles and Permissions',
  'Different roles have different access levels: Owner (full access), Manager (most features), Service Advisor (customer-facing features), Technician (work orders and time tracking), Reception (appointments and customer info). Assign roles based on job responsibilities.',
  hc.id,
  '["users", "permissions", "roles", "security"]'::jsonb,
  'system',
  203,
  19,
  false,
  4,
  'intermediate',
  now()
FROM help_categories hc WHERE hc.name = 'Account Management';

-- Add realistic FAQ entries
INSERT INTO help_faqs (
  id, question, answer, category, view_count, helpful_count, created_at, updated_at
) VALUES 
(
  gen_random_uuid(),
  'How do I add a new customer to the system?',
  'To add a new customer: 1. Go to Customers section 2. Click "Add Customer" 3. Fill in required information (name, phone, email) 4. Add vehicle information if needed 5. Save the customer profile. You can always add more details later.',
  'getting_started',
  45,
  12,
  now(),
  now()
),
(
  gen_random_uuid(),
  'Can I customize my work order templates?',
  'Yes! Go to Settings > Work Order Templates. You can create custom templates for common services, set default labor rates, and include standard parts. This saves time and ensures consistency.',
  'advanced_features',
  67,
  23,
  now(),
  now()
),
(
  gen_random_uuid(),
  'Why can''t I see some menu options?',
  'Menu visibility depends on your user role and permissions. Contact your shop owner or manager to adjust your permissions if you need access to additional features.',
  'account_management',
  89,
  8,
  now(),
  now()
),
(
  gen_random_uuid(),
  'How do I track inventory levels?',
  'The inventory system automatically tracks stock levels. Set reorder points for automatic alerts when items run low. You can view current stock levels in the Inventory section and generate reports for analysis.',
  'advanced_features',
  134,
  31,
  now(),
  now()
),
(
  gen_random_uuid(),
  'What should I do if the system is running slowly?',
  'Try these steps: 1. Refresh your browser 2. Clear browser cache 3. Check your internet connection 4. Try a different browser 5. Restart your device. If problems persist, contact support with details about when the slowness occurs.',
  'troubleshooting',
  76,
  15,
  now(),
  now()
);

-- Add sample user progress for current user (if authenticated)
INSERT INTO user_progress (
  user_id, content_type, content_id, status, progress_percentage, 
  time_spent_minutes, last_accessed, completed_at
)
SELECT 
  auth.uid(),
  'article',
  ha.id,
  CASE 
    WHEN random() < 0.3 THEN 'completed'
    WHEN random() < 0.6 THEN 'in_progress' 
    ELSE 'not_started'
  END,
  CASE 
    WHEN random() < 0.3 THEN 100
    WHEN random() < 0.6 THEN floor(random() * 80 + 20)
    ELSE 0
  END,
  floor(random() * 15 + 2),
  now() - interval '1 day' * floor(random() * 7),
  CASE WHEN random() < 0.3 THEN now() - interval '1 day' * floor(random() * 3) ELSE NULL END
FROM help_articles ha
WHERE auth.uid() IS NOT NULL
LIMIT 5;

-- Add sample achievements for current user
INSERT INTO user_achievements (
  user_id, achievement_type, achievement_name, achievement_description, 
  points_awarded, icon_name, earned_at
)
SELECT 
  auth.uid(),
  'first_article',
  'Getting Started',
  'Read your first help article',
  10,
  'book-open',
  now() - interval '2 days'
WHERE auth.uid() IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM user_achievements WHERE user_id = auth.uid()
);

-- Initialize user points for current user if not exists
INSERT INTO user_points (user_id, total_points, articles_completed, paths_completed)
SELECT 
  auth.uid(),
  25,
  2,
  0
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  total_points = GREATEST(user_points.total_points, 25),
  articles_completed = GREATEST(user_points.articles_completed, 2);

-- Add some reading analytics
INSERT INTO reading_analytics (
  user_id, article_id, time_spent_seconds, scroll_percentage, 
  completed_reading, session_start, session_end
)
SELECT 
  auth.uid(),
  ha.id,
  floor(random() * 300 + 60),
  floor(random() * 100),
  random() < 0.6,
  now() - interval '1 day' * floor(random() * 7),
  now() - interval '1 day' * floor(random() * 7) + interval '1 minute' * floor(random() * 10 + 2)
FROM help_articles ha
WHERE auth.uid() IS NOT NULL
ORDER BY random()
LIMIT 3;
