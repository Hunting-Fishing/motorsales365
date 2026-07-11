-- Initialize shop and profile data, and populate default settings
DO $$
DECLARE
  sample_shop_id UUID;
  sample_user_id UUID;
BEGIN
  -- Check if we already have a shop, if not create one
  SELECT id INTO sample_shop_id FROM shops LIMIT 1;
  
  IF sample_shop_id IS NULL THEN
    -- Create a sample shop
    INSERT INTO shops (name, address, city, state, zip, phone, email)
    VALUES ('Demo Auto Shop', '123 Main Street', 'Demo City', 'CA', '12345', '(555) 123-4567', 'demo@autoshop.com')
    RETURNING id INTO sample_shop_id;
  END IF;
  
  -- Check if we have a profile linked to this shop
  SELECT id INTO sample_user_id FROM profiles WHERE shop_id = sample_shop_id LIMIT 1;
  
  -- Initialize default settings for all categories if they don't exist
  
  -- Company settings
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'company', 'business_name', '"Demo Auto Shop"'::jsonb),
  (sample_shop_id, 'company', 'address', '"123 Main Street"'::jsonb),
  (sample_shop_id, 'company', 'city', '"Demo City"'::jsonb),
  (sample_shop_id, 'company', 'state', '"CA"'::jsonb),
  (sample_shop_id, 'company', 'zip', '"12345"'::jsonb),
  (sample_shop_id, 'company', 'phone', '"(555) 123-4567"'::jsonb),
  (sample_shop_id, 'company', 'email', '"demo@autoshop.com"'::jsonb),
  (sample_shop_id, 'company', 'business_type', '"auto_repair"'::jsonb),
  (sample_shop_id, 'company', 'industry', '"automotive"'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  -- Work order settings
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'work_order', 'available_statuses', '[
    {"value": "pending", "label": "Pending"},
    {"value": "in-progress", "label": "In Progress"},
    {"value": "completed", "label": "Completed"},
    {"value": "cancelled", "label": "Cancelled"}
  ]'::jsonb),
  (sample_shop_id, 'work_order', 'available_priorities', '[
    {"value": "low", "label": "Low"},
    {"value": "medium", "label": "Medium"},
    {"value": "high", "label": "High"},
    {"value": "urgent", "label": "Urgent"}
  ]'::jsonb),
  (sample_shop_id, 'work_order', 'default_status', '"pending"'::jsonb),
  (sample_shop_id, 'work_order', 'default_priority', '"medium"'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  -- Notification settings
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'notifications', 'email_enabled', 'true'::jsonb),
  (sample_shop_id, 'notifications', 'sms_enabled', 'false'::jsonb),
  (sample_shop_id, 'notifications', 'work_order_notifications', 'true'::jsonb),
  (sample_shop_id, 'notifications', 'appointment_reminders', 'true'::jsonb),
  (sample_shop_id, 'notifications', 'customer_communication', 'true'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  -- Security settings
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'security', 'require_2fa', 'false'::jsonb),
  (sample_shop_id, 'security', 'session_timeout', '480'::jsonb),
  (sample_shop_id, 'security', 'password_policy', '{"min_length": 8, "require_uppercase": true, "require_numbers": true}'::jsonb),
  (sample_shop_id, 'security', 'login_attempts', '5'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  -- System settings
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'system', 'timezone', '"America/New_York"'::jsonb),
  (sample_shop_id, 'system', 'date_format', '"MM/dd/yyyy"'::jsonb),
  (sample_shop_id, 'system', 'currency', '"USD"'::jsonb),
  (sample_shop_id, 'system', 'language', '"en"'::jsonb),
  (sample_shop_id, 'system', 'auto_backup', 'true'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  -- Integrations settings
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'integrations', 'email_service', '"resend"'::jsonb),
  (sample_shop_id, 'integrations', 'sms_service', '"twilio"'::jsonb),
  (sample_shop_id, 'integrations', 'payment_gateway', '"stripe"'::jsonb),
  (sample_shop_id, 'integrations', 'calendar_sync', 'false'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  -- Business hours (as unified settings)
  INSERT INTO unified_settings (shop_id, category, key, value) VALUES
  (sample_shop_id, 'business_hours', 'monday', '{"is_closed": false, "open_time": "08:00", "close_time": "17:00"}'::jsonb),
  (sample_shop_id, 'business_hours', 'tuesday', '{"is_closed": false, "open_time": "08:00", "close_time": "17:00"}'::jsonb),
  (sample_shop_id, 'business_hours', 'wednesday', '{"is_closed": false, "open_time": "08:00", "close_time": "17:00"}'::jsonb),
  (sample_shop_id, 'business_hours', 'thursday', '{"is_closed": false, "open_time": "08:00", "close_time": "17:00"}'::jsonb),
  (sample_shop_id, 'business_hours', 'friday', '{"is_closed": false, "open_time": "08:00", "close_time": "17:00"}'::jsonb),
  (sample_shop_id, 'business_hours', 'saturday', '{"is_closed": false, "open_time": "09:00", "close_time": "15:00"}'::jsonb),
  (sample_shop_id, 'business_hours', 'sunday', '{"is_closed": true, "open_time": "", "close_time": ""}'::jsonb)
  ON CONFLICT (shop_id, category, key) DO NOTHING;
  
  RAISE NOTICE 'Initialized default settings for shop: %', sample_shop_id;
END $$;