-- Fix search_path for equipment functions to address security warnings

-- Update the update_equipment_updated_at function
CREATE OR REPLACE FUNCTION update_equipment_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- The create_equipment_audit_trail already has SECURITY DEFINER but let's ensure it's properly set
CREATE OR REPLACE FUNCTION create_equipment_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Get the user's name
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO user_name
  FROM profiles WHERE id = auth.uid();
  
  -- Insert audit record
  INSERT INTO equipment_audit_trail (
    shop_id,
    entity_type,
    entity_id,
    action,
    old_value,
    new_value,
    changed_by,
    changed_by_name
  ) VALUES (
    COALESCE(NEW.shop_id, OLD.shop_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    user_name
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;