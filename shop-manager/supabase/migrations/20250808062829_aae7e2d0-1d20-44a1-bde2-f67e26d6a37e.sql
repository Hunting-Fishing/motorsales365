-- Fix security warnings - Properly update the function with search_path
DROP TRIGGER IF EXISTS trigger_initialize_shop_settings ON profiles;
DROP FUNCTION IF EXISTS initialize_shop_settings() CASCADE;

CREATE OR REPLACE FUNCTION initialize_shop_settings()
RETURNS TRIGGER AS $$
DECLARE
  target_shop_id UUID;
BEGIN
  -- Get the shop_id from the new profile
  target_shop_id := NEW.shop_id;
  
  -- Only proceed if shop_id is not null
  IF target_shop_id IS NOT NULL THEN
    -- Initialize appearance_settings
    INSERT INTO appearance_settings (shop_id, theme_mode, font_family, primary_color, secondary_color, accent_color)
    VALUES (target_shop_id, 'light', 'Inter', '#0f172a', '#64748b', '#3b82f6')
    ON CONFLICT (shop_id) DO NOTHING;
    
    -- Initialize branding_settings
    INSERT INTO branding_settings (shop_id, theme, primary_color, secondary_color, accent_color)
    VALUES (target_shop_id, 'light', '#3B82F6', '#10B981', '#EC4899')
    ON CONFLICT (shop_id) DO NOTHING;
    
    -- Initialize security_settings
    INSERT INTO security_settings (shop_id, password_policy, mfa_enabled, session_timeout_minutes, ip_whitelist)
    VALUES (target_shop_id, '{"min_length": 8, "require_numbers": true, "require_special": false}'::jsonb, false, 480, ARRAY[]::text[])
    ON CONFLICT (shop_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Recreate the trigger
CREATE TRIGGER trigger_initialize_shop_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_shop_settings();