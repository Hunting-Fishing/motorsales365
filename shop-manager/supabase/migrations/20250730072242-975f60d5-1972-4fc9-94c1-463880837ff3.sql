-- Create safe getter and setter RPC functions for unified settings
CREATE OR REPLACE FUNCTION get_setting_safe(
  p_shop_id UUID,
  p_category TEXT,
  p_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  setting_value JSONB;
BEGIN
  -- Get from unified settings first
  SELECT value INTO setting_value
  FROM unified_settings
  WHERE shop_id = p_shop_id 
    AND category = p_category 
    AND key = p_key;
  
  -- If not found and category is 'company', try legacy table
  IF setting_value IS NULL AND p_category = 'company' THEN
    SELECT settings_value INTO setting_value
    FROM company_settings
    WHERE shop_id = p_shop_id 
      AND settings_key = p_key;
  END IF;
  
  RETURN setting_value;
END;
$$;

CREATE OR REPLACE FUNCTION set_setting_safe(
  p_shop_id UUID,
  p_category TEXT,
  p_key TEXT,
  p_value TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  parsed_value JSONB;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Parse the JSON value
  BEGIN
    parsed_value := p_value::JSONB;
  EXCEPTION WHEN OTHERS THEN
    -- If it's not valid JSON, wrap it as a string
    parsed_value := to_jsonb(p_value);
  END;
  
  -- Insert or update in unified settings
  INSERT INTO unified_settings (
    shop_id, category, key, value, 
    created_by, updated_by
  ) VALUES (
    p_shop_id, p_category, p_key, parsed_value,
    current_user_id, current_user_id
  )
  ON CONFLICT (shop_id, category, key)
  DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = current_user_id,
    updated_at = now();
  
  -- Also update legacy table if category is 'company'
  IF p_category = 'company' THEN
    INSERT INTO company_settings (
      shop_id, settings_key, settings_value, created_by, updated_by
    ) VALUES (
      p_shop_id, p_key, parsed_value, current_user_id::TEXT, current_user_id::TEXT
    )
    ON CONFLICT (shop_id, settings_key)
    DO UPDATE SET
      settings_value = EXCLUDED.settings_value,
      updated_by = current_user_id::TEXT,
      updated_at = now();
  END IF;
END;
$$;