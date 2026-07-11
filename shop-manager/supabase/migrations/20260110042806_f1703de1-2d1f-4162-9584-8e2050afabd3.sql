-- Add module-specific display/branding columns to shop_enabled_modules
ALTER TABLE shop_enabled_modules
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS display_logo_url text,
ADD COLUMN IF NOT EXISTS display_phone text,
ADD COLUMN IF NOT EXISTS display_email text,
ADD COLUMN IF NOT EXISTS display_address text,
ADD COLUMN IF NOT EXISTS display_description text;

-- Add comments for clarity
COMMENT ON COLUMN shop_enabled_modules.display_name IS 'Public-facing business name for this module (overrides shop name)';
COMMENT ON COLUMN shop_enabled_modules.display_logo_url IS 'Logo URL for this module (overrides shop logo)';
COMMENT ON COLUMN shop_enabled_modules.display_phone IS 'Contact phone for this module';
COMMENT ON COLUMN shop_enabled_modules.display_email IS 'Contact email for this module';
COMMENT ON COLUMN shop_enabled_modules.display_address IS 'Business address for this module';
COMMENT ON COLUMN shop_enabled_modules.display_description IS 'Public description for this module';