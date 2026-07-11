-- Add profile_image_url column to equipment_assets table
ALTER TABLE equipment_assets 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

COMMENT ON COLUMN equipment_assets.profile_image_url IS 'URL to the equipment profile/thumbnail image stored in equipment_attachments bucket';