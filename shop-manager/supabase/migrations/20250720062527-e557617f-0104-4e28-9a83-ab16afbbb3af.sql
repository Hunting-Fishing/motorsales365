-- Migrate Work Order constants to unified settings system
-- First, create business constants for work order statuses and priorities

-- Add work order status options to business constants
INSERT INTO business_constants (key, label, value, description, category, is_system_default, shop_id) VALUES
('work_order_status_pending', 'Pending', 'pending', 'Work order is pending assignment', 'work_order_statuses', true, NULL),
('work_order_status_in_progress', 'In Progress', 'in-progress', 'Work order is currently being worked on', 'work_order_statuses', true, NULL),
('work_order_status_on_hold', 'On Hold', 'on-hold', 'Work order is temporarily paused', 'work_order_statuses', true, NULL),
('work_order_status_completed', 'Completed', 'completed', 'Work order has been completed', 'work_order_statuses', true, NULL),
('work_order_status_cancelled', 'Cancelled', 'cancelled', 'Work order has been cancelled', 'work_order_statuses', true, NULL),
('work_order_status_body_shop', 'Body Shop', 'body-shop', 'Vehicle is at body shop', 'work_order_statuses', true, NULL),
('work_order_status_mobile_service', 'Mobile Service', 'mobile-service', 'Mobile service work order', 'work_order_statuses', true, NULL),
('work_order_status_needs_road_test', 'Needs Road Test', 'needs-road-test', 'Vehicle needs road testing', 'work_order_statuses', true, NULL),
('work_order_status_parts_requested', 'Parts Requested', 'parts-requested', 'Parts have been requested', 'work_order_statuses', true, NULL),
('work_order_status_parts_ordered', 'Parts Ordered', 'parts-ordered', 'Parts have been ordered', 'work_order_statuses', true, NULL),
('work_order_status_parts_arrived', 'Parts Arrived', 'parts-arrived', 'Parts have arrived', 'work_order_statuses', true, NULL),
('work_order_status_customer_to_return', 'Customer to Return', 'customer-to-return', 'Waiting for customer to return', 'work_order_statuses', true, NULL),
('work_order_status_rebooked', 'Rebooked', 'rebooked', 'Work order has been rebooked', 'work_order_statuses', true, NULL),
('work_order_status_foreman_signoff_waiting', 'Foreman Sign-off Waiting', 'foreman-signoff-waiting', 'Waiting for foreman sign-off', 'work_order_statuses', true, NULL),
('work_order_status_foreman_signoff_complete', 'Foreman Sign-off Complete', 'foreman-signoff-complete', 'Foreman sign-off completed', 'work_order_statuses', true, NULL),
('work_order_status_sublet', 'Sublet', 'sublet', 'Work subletted to external provider', 'work_order_statuses', true, NULL),
('work_order_status_waiting_customer_auth', 'Waiting for Customer Auth', 'waiting-customer-auth', 'Waiting for customer authorization', 'work_order_statuses', true, NULL),
('work_order_status_po_requested', 'PO Requested', 'po-requested', 'Purchase order requested', 'work_order_statuses', true, NULL),
('work_order_status_tech_support', 'Tech Support', 'tech-support', 'Technical support required', 'work_order_statuses', true, NULL),
('work_order_status_warranty', 'Warranty', 'warranty', 'Warranty work', 'work_order_statuses', true, NULL),
('work_order_status_internal_ro', 'Internal RO', 'internal-ro', 'Internal repair order', 'work_order_statuses', true, NULL);

-- Add work order priority options to business constants
INSERT INTO business_constants (key, label, value, description, category, is_system_default, shop_id) VALUES
('work_order_priority_low', 'Low', 'low', 'Low priority work order', 'work_order_priorities', true, NULL),
('work_order_priority_medium', 'Medium', 'medium', 'Medium priority work order', 'work_order_priorities', true, NULL),
('work_order_priority_high', 'High', 'high', 'High priority work order', 'work_order_priorities', true, NULL),
('work_order_priority_urgent', 'Urgent', 'urgent', 'Urgent priority work order', 'work_order_priorities', true, NULL);

-- Add default work order preferences to unified settings
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by) 
SELECT 
  p.shop_id,
  'work_order_defaults',
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
  'work_order_defaults',
  'default_priority',
  '"medium"'::jsonb,
  p.id,
  p.id
FROM profiles p
WHERE p.shop_id IS NOT NULL
ON CONFLICT (shop_id, category, key) DO NOTHING;