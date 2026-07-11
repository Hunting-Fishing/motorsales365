-- Migrate existing dashboard preferences from user_preferences to unified_settings
-- This consolidates all settings into our unified system

-- Migrate existing dashboard preferences to unified settings
WITH dashboard_prefs AS (
  SELECT 
    p.shop_id,
    up.user_id,
    up.preferences
  FROM user_preferences up
  JOIN profiles p ON p.id = up.user_id
  WHERE up.category = 'dashboard'
    AND p.shop_id IS NOT NULL
)
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by)
SELECT 
  dp.shop_id,
  'dashboard',
  'user_preferences',
  jsonb_build_object(dp.user_id, dp.preferences),
  dp.user_id,
  dp.user_id
FROM dashboard_prefs dp
ON CONFLICT (shop_id, category, key) 
DO UPDATE SET 
  value = unified_settings.value || EXCLUDED.value,
  updated_by = EXCLUDED.updated_by,
  updated_at = now();

-- Create default dashboard widget configuration for shops without preferences
WITH default_widgets AS (
  SELECT jsonb_build_array(
    jsonb_build_object('id', 'statsCards', 'name', 'Key Statistics', 'enabled', true, 'position', 0),
    jsonb_build_object('id', 'revenueChart', 'name', 'Revenue Chart', 'enabled', true, 'position', 1),
    jsonb_build_object('id', 'serviceDistribution', 'name', 'Service Distribution', 'enabled', true, 'position', 2),
    jsonb_build_object('id', 'technicianPerformance', 'name', 'Technician Performance', 'enabled', true, 'position', 3),
    jsonb_build_object('id', 'workOrderProgress', 'name', 'Work Order Progress', 'enabled', true, 'position', 4),
    jsonb_build_object('id', 'todaySchedule', 'name', 'Today''s Schedule', 'enabled', true, 'position', 5),
    jsonb_build_object('id', 'equipmentRecommendations', 'name', 'Equipment Recommendations', 'enabled', true, 'position', 6),
    jsonb_build_object('id', 'dashboardAlerts', 'name', 'Alerts & Notifications', 'enabled', true, 'position', 7)
  ) AS widgets
),
default_dashboard_config AS (
  SELECT jsonb_build_object(
    'layout', 'detailed',
    'refreshInterval', 30,
    'widgets', dw.widgets,
    'defaultView', 'default'
  ) AS config
  FROM default_widgets dw
)
INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by)
SELECT 
  p.shop_id,
  'dashboard',
  'default_configuration',
  ddc.config,
  p.id,
  p.id
FROM profiles p, default_dashboard_config ddc
WHERE p.shop_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM unified_settings us 
    WHERE us.shop_id = p.shop_id 
      AND us.category = 'dashboard'
      AND us.key = 'default_configuration'
  );