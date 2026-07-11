-- Create work order configuration in unified settings system
-- This creates configurable work order statuses and priorities per shop

-- Create default work order status configurations for all existing shops
WITH default_statuses AS (
  SELECT jsonb_build_array(
    jsonb_build_object('value', 'pending', 'label', 'Pending'),
    jsonb_build_object('value', 'in-progress', 'label', 'In Progress'),
    jsonb_build_object('value', 'on-hold', 'label', 'On Hold'),
    jsonb_build_object('value', 'completed', 'label', 'Completed'),
    jsonb_build_object('value', 'cancelled', 'label', 'Cancelled'),
    jsonb_build_object('value', 'body-shop', 'label', 'Body Shop'),
    jsonb_build_object('value', 'mobile-service', 'label', 'Mobile Service'),
    jsonb_build_object('value', 'needs-road-test', 'label', 'Needs Road Test'),
    jsonb_build_object('value', 'parts-requested', 'label', 'Parts Requested'),
    jsonb_build_object('value', 'parts-ordered', 'label', 'Parts Ordered'),
    jsonb_build_object('value', 'parts-arrived', 'label', 'Parts Arrived'),
    jsonb_build_object('value', 'customer-to-return', 'label', 'Customer to Return'),
    jsonb_build_object('value', 'rebooked', 'label', 'Rebooked'),
    jsonb_build_object('value', 'foreman-signoff-waiting', 'label', 'Foreman Sign-off Waiting'),
    jsonb_build_object('value', 'foreman-signoff-complete', 'label', 'Foreman Sign-off Complete'),
    jsonb_build_object('value', 'sublet', 'label', 'Sublet'),
    jsonb_build_object('value', 'waiting-customer-auth', 'label', 'Waiting for Customer Auth'),
    jsonb_build_object('value', 'po-requested', 'label', 'PO Requested'),
    jsonb_build_object('value', 'tech-support', 'label', 'Tech Support'),
    jsonb_build_object('value', 'warranty', 'label', 'Warranty'),
    jsonb_build_object('value', 'internal-ro', 'label', 'Internal RO')
  ) AS statuses
),
default_priorities AS (
  SELECT jsonb_build_array(
    jsonb_build_object('value', 'low', 'label', 'Low'),
    jsonb_build_object('value', 'medium', 'label', 'Medium'),
    jsonb_build_object('value', 'high', 'label', 'High'),
    jsonb_build_object('value', 'urgent', 'label', 'Urgent')
  ) AS priorities
)
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'work_order',
  'available_statuses',
  ds.statuses,
  p.id,
  p.id
FROM profiles p, default_statuses ds
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;

-- Insert default priorities
WITH default_priorities AS (
  SELECT jsonb_build_array(
    jsonb_build_object('value', 'low', 'label', 'Low'),
    jsonb_build_object('value', 'medium', 'label', 'Medium'),
    jsonb_build_object('value', 'high', 'label', 'High'),
    jsonb_build_object('value', 'urgent', 'label', 'Urgent')
  ) AS priorities
)
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'work_order',
  'available_priorities',
  dp.priorities,
  p.id,
  p.id
FROM profiles p, default_priorities dp
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;

-- Add default work order form values
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'work_order',
  'default_status',
  '"pending"'::jsonb,
  p.id,
  p.id
FROM profiles p
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;

INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'work_order',
  'default_priority',
  '"medium"'::jsonb,
  p.id,
  p.id
FROM profiles p
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;