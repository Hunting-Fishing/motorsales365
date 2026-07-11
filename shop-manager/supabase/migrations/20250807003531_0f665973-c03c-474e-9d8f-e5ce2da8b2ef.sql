-- Phase 1: Database Structure Fixes and Data Initialization

-- Add proper foreign key constraints and indexes
ALTER TABLE appearance_settings 
ADD CONSTRAINT fk_appearance_settings_shop_id 
FOREIGN KEY (shop_id) REFERENCES profiles(shop_id) ON DELETE CASCADE;

ALTER TABLE branding_settings 
ADD CONSTRAINT fk_branding_settings_shop_id 
FOREIGN KEY (shop_id) REFERENCES profiles(shop_id) ON DELETE CASCADE;

ALTER TABLE security_settings 
ADD CONSTRAINT fk_security_settings_shop_id 
FOREIGN KEY (shop_id) REFERENCES profiles(shop_id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appearance_settings_shop_id ON appearance_settings(shop_id);
CREATE INDEX IF NOT EXISTS idx_branding_settings_shop_id ON branding_settings(shop_id);  
CREATE INDEX IF NOT EXISTS idx_security_settings_shop_id ON security_settings(shop_id);
CREATE INDEX IF NOT EXISTS idx_unified_settings_shop_category ON unified_settings(shop_id, category);

-- Phase 2: Initialize missing settings for all shops
-- Get all unique shop_ids and create default settings records

-- Initialize appearance_settings for all shops
INSERT INTO appearance_settings (shop_id, theme_mode, font_family, primary_color, secondary_color, accent_color)
SELECT DISTINCT 
  p.shop_id,
  'light' as theme_mode,
  'Inter' as font_family,
  '#0f172a' as primary_color,
  '#64748b' as secondary_color,
  '#3b82f6' as accent_color
FROM profiles p
WHERE p.shop_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM appearance_settings a WHERE a.shop_id = p.shop_id
  );

-- Initialize branding_settings for all shops  
INSERT INTO branding_settings (shop_id, theme, primary_color, secondary_color, accent_color)
SELECT DISTINCT
  p.shop_id,
  'light' as theme,
  '#3B82F6' as primary_color,
  '#10B981' as secondary_color,
  '#EC4899' as accent_color
FROM profiles p
WHERE p.shop_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM branding_settings b WHERE b.shop_id = p.shop_id
  );

-- Initialize security_settings for all shops
INSERT INTO security_settings (shop_id, password_policy, mfa_enabled, session_timeout_minutes, ip_whitelist)
SELECT DISTINCT
  p.shop_id,
  '{"min_length": 8, "require_numbers": true, "require_special": false}'::jsonb as password_policy,
  false as mfa_enabled,
  480 as session_timeout_minutes, -- 8 hours
  '{}' as ip_whitelist
FROM profiles p
WHERE p.shop_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM security_settings s WHERE s.shop_id = p.shop_id
  );

-- Create function to automatically initialize settings for new shops
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
    VALUES (target_shop_id, '{"min_length": 8, "require_numbers": true, "require_special": false}'::jsonb, false, 480, '{}')
    ON CONFLICT (shop_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically initialize settings when new profiles are created
DROP TRIGGER IF EXISTS trigger_initialize_shop_settings ON profiles;
CREATE TRIGGER trigger_initialize_shop_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_shop_settings();

-- Add unique constraints to prevent duplicate settings per shop
ALTER TABLE appearance_settings ADD CONSTRAINT unique_appearance_per_shop UNIQUE (shop_id);
ALTER TABLE branding_settings ADD CONSTRAINT unique_branding_per_shop UNIQUE (shop_id);
ALTER TABLE security_settings ADD CONSTRAINT unique_security_per_shop UNIQUE (shop_id);

-- Create function to sync legacy settings to unified_settings
CREATE OR REPLACE FUNCTION sync_legacy_to_unified()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync appearance settings
  IF TG_TABLE_NAME = 'appearance_settings' THEN
    INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by)
    VALUES 
      (NEW.shop_id, 'appearance', 'theme_mode', to_jsonb(NEW.theme_mode), auth.uid(), auth.uid()),
      (NEW.shop_id, 'appearance', 'font_family', to_jsonb(NEW.font_family), auth.uid(), auth.uid()),
      (NEW.shop_id, 'appearance', 'primary_color', to_jsonb(NEW.primary_color), auth.uid(), auth.uid()),
      (NEW.shop_id, 'appearance', 'secondary_color', to_jsonb(NEW.secondary_color), auth.uid(), auth.uid()),
      (NEW.shop_id, 'appearance', 'accent_color', to_jsonb(NEW.accent_color), auth.uid(), auth.uid())
    ON CONFLICT (shop_id, category, key) 
    DO UPDATE SET 
      value = EXCLUDED.value,
      updated_by = auth.uid(),
      updated_at = now();
  END IF;
  
  -- Sync branding settings
  IF TG_TABLE_NAME = 'branding_settings' THEN
    INSERT INTO unified_settings (shop_id, category, key, value, created_by, updated_by)
    VALUES 
      (NEW.shop_id, 'branding', 'theme', to_jsonb(NEW.theme), auth.uid(), auth.uid()),
      (NEW.shop_id, 'branding', 'primary_color', to_jsonb(NEW.primary_color), auth.uid(), auth.uid()),
      (NEW.shop_id, 'branding', 'secondary_color', to_jsonb(NEW.secondary_color), auth.uid(), auth.uid()),
      (NEW.shop_id, 'branding', 'accent_color', to_jsonb(NEW.accent_color), auth.uid(), auth.uid()),
      (NEW.shop_id, 'branding', 'logo_url', to_jsonb(NEW.logo_url), auth.uid(), auth.uid())
    ON CONFLICT (shop_id, category, key) 
    DO UPDATE SET 
      value = EXCLUDED.value,
      updated_by = auth.uid(),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for real-time sync
CREATE TRIGGER sync_appearance_to_unified
  AFTER INSERT OR UPDATE ON appearance_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_to_unified();

CREATE TRIGGER sync_branding_to_unified
  AFTER INSERT OR UPDATE ON branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION sync_legacy_to_unified();