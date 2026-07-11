-- Create default report templates in unified_settings
INSERT INTO unified_settings (
  shop_id, 
  category, 
  key, 
  value, 
  migrated_from,
  created_at,
  updated_at
) VALUES 
(
  (SELECT id FROM shops LIMIT 1), -- This will need to be updated per shop
  'report_templates',
  'annual_impact_report',
  '{
    "name": "Annual Impact Report",
    "description": "Comprehensive report showing annual impact metrics and achievements",
    "template_type": "impact",
    "template_content": {
      "sections": [
        {"title": "Executive Summary", "type": "text", "required": true},
        {"title": "Program Outcomes", "type": "metrics", "required": true},
        {"title": "Financial Overview", "type": "financial", "required": true},
        {"title": "Volunteer Impact", "type": "volunteer_stats", "required": false},
        {"title": "Donor Recognition", "type": "donor_list", "required": false}
      ]
    },
    "is_active": true
  }'::jsonb,
  'DEFAULT_TEMPLATES',
  now(),
  now()
),
(
  (SELECT id FROM shops LIMIT 1),
  'report_templates',
  'grant_application_report',
  '{
    "name": "Grant Application Report",
    "description": "Template for grant applications and progress reports",
    "template_type": "grant",
    "template_content": {
      "sections": [
        {"title": "Project Description", "type": "text", "required": true},
        {"title": "Budget Breakdown", "type": "budget", "required": true},
        {"title": "Timeline & Milestones", "type": "timeline", "required": true},
        {"title": "Expected Outcomes", "type": "metrics", "required": true},
        {"title": "Organization Capacity", "type": "capacity", "required": false}
      ]
    },
    "is_active": true
  }'::jsonb,
  'DEFAULT_TEMPLATES',
  now(),
  now()
),
(
  (SELECT id FROM shops LIMIT 1),
  'report_templates',
  'board_meeting_report',
  '{
    "name": "Board Meeting Report",
    "description": "Regular board meeting reports with financial and operational updates",
    "template_type": "board",
    "template_content": {
      "sections": [
        {"title": "Financial Summary", "type": "financial", "required": true},
        {"title": "Program Updates", "type": "program_status", "required": true},
        {"title": "Volunteer Metrics", "type": "volunteer_stats", "required": false},
        {"title": "Upcoming Events", "type": "events", "required": false},
        {"title": "Action Items", "type": "action_items", "required": true}
      ]
    },
    "is_active": true
  }'::jsonb,
  'DEFAULT_TEMPLATES',
  now(),
  now()
);

-- Create a function to get report templates for a shop
CREATE OR REPLACE FUNCTION get_report_templates(p_shop_id uuid)
RETURNS TABLE(
  key text,
  template_data jsonb
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    us.key,
    us.value as template_data
  FROM unified_settings us
  WHERE us.shop_id = p_shop_id
    AND us.category = 'report_templates'
  ORDER BY us.created_at;
END;
$function$;

-- Create a function to add/update report templates
CREATE OR REPLACE FUNCTION set_report_template(p_shop_id uuid, p_key text, p_template_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  setting_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  INSERT INTO unified_settings (
    shop_id, category, key, value, 
    created_by, updated_by
  ) VALUES (
    p_shop_id, 'report_templates', p_key, p_template_data,
    current_user_id, current_user_id
  )
  ON CONFLICT (shop_id, category, key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = current_user_id,
    updated_at = now()
  RETURNING id INTO setting_id;
  
  RETURN setting_id;
END;
$function$;