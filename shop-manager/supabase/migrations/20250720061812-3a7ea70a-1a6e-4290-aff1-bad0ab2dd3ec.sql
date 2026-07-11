-- SAFE SETTINGS MIGRATION: Create new unified system alongside existing one
-- This migration ensures zero downtime and no data conflicts

-- Step 1: Create the unified_settings table (already done in first migration, but let's ensure it exists)
CREATE TABLE IF NOT EXISTS public.unified_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  validation_rules JSONB DEFAULT '{}',
  is_encrypted BOOLEAN DEFAULT false,
  migrated_from TEXT, -- Track where this setting came from
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(shop_id, category, key)
);

-- Add migration tracking column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'unified_settings' 
                 AND column_name = 'migrated_from') THEN
    ALTER TABLE public.unified_settings ADD COLUMN migrated_from TEXT;
  END IF;
END $$;

-- Step 2: Create migration functions that won't conflict
CREATE OR REPLACE FUNCTION public.migrate_company_settings_to_unified()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_record RECORD;
  migrated_count INTEGER := 0;
BEGIN
  -- Migrate existing company_settings without conflicts
  FOR setting_record IN 
    SELECT cs.shop_id, cs.settings_key, cs.settings_value, cs.updated_at
    FROM company_settings cs
    LEFT JOIN unified_settings us ON (
      us.shop_id = cs.shop_id 
      AND us.category = 'company' 
      AND us.key = cs.settings_key
    )
    WHERE us.id IS NULL -- Only migrate if not already exists
  LOOP
    BEGIN
      INSERT INTO unified_settings (
        shop_id, 
        category, 
        key, 
        value, 
        migrated_from,
        created_at,
        updated_at
      ) VALUES (
        setting_record.shop_id,
        'company',
        setting_record.settings_key,
        setting_record.settings_value,
        'company_settings',
        setting_record.updated_at,
        setting_record.updated_at
      );
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION WHEN unique_violation THEN
      -- Skip duplicates, this is safe
      CONTINUE;
    END;
  END LOOP;
  
  RETURN migrated_count;
END;
$$;

-- Step 3: Create hybrid accessor functions that check both systems
CREATE OR REPLACE FUNCTION public.get_setting_safe(
  p_shop_id UUID,
  p_category TEXT,
  p_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_value JSONB;
BEGIN
  -- First try unified_settings
  SELECT value INTO setting_value
  FROM public.unified_settings
  WHERE shop_id = p_shop_id
    AND category = p_category
    AND key = p_key;
  
  -- If not found and category is 'company', try legacy company_settings
  IF setting_value IS NULL AND p_category = 'company' THEN
    SELECT settings_value INTO setting_value
    FROM public.company_settings
    WHERE shop_id = p_shop_id
      AND settings_key = p_key;
  END IF;
  
  RETURN COALESCE(setting_value, 'null'::jsonb);
END;
$$;

-- Step 4: Create safe setter that updates both systems during transition
CREATE OR REPLACE FUNCTION public.set_setting_safe(
  p_shop_id UUID,
  p_category TEXT,
  p_key TEXT,
  p_value JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user safely
  current_user_id := auth.uid();
  
  -- Update/insert into unified_settings
  INSERT INTO public.unified_settings (
    shop_id, category, key, value, 
    created_by, updated_by
  ) VALUES (
    p_shop_id, p_category, p_key, p_value,
    current_user_id, current_user_id
  )
  ON CONFLICT (shop_id, category, key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = current_user_id,
    updated_at = now()
  RETURNING id INTO setting_id;
  
  -- Also update legacy table if category is 'company' (for backward compatibility)
  IF p_category = 'company' THEN
    INSERT INTO public.company_settings (
      shop_id, settings_key, settings_value, updated_at
    ) VALUES (
      p_shop_id, p_key, p_value, now()
    )
    ON CONFLICT (shop_id, settings_key)
    DO UPDATE SET
      settings_value = EXCLUDED.settings_value,
      updated_at = now();
  END IF;
  
  RETURN setting_id;
END;
$$;

-- Step 5: Create validation function to ensure data integrity
CREATE OR REPLACE FUNCTION public.validate_settings_migration()
RETURNS TABLE(
  shop_id UUID,
  settings_key TEXT,
  legacy_exists BOOLEAN,
  unified_exists BOOLEAN,
  values_match BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.shop_id,
    cs.settings_key,
    TRUE as legacy_exists,
    (us.id IS NOT NULL) as unified_exists,
    (cs.settings_value = us.value) as values_match
  FROM company_settings cs
  LEFT JOIN unified_settings us ON (
    us.shop_id = cs.shop_id 
    AND us.category = 'company' 
    AND us.key = cs.settings_key
  )
  ORDER BY cs.shop_id, cs.settings_key;
$$;