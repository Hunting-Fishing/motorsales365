-- Complete remaining function security fixes (SET search_path)
-- These are the remaining functions that need search path protection

-- Fix update_inventory_on_adjustment function
CREATE OR REPLACE FUNCTION public.update_inventory_on_adjustment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update inventory quantity based on adjustment type
  IF NEW.adjustment_type = 'consume' THEN
    UPDATE inventory_items 
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.inventory_item_id;
  ELSIF NEW.adjustment_type = 'return' THEN
    UPDATE inventory_items 
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix get_report_templates function
CREATE OR REPLACE FUNCTION public.get_report_templates(p_shop_id uuid)
RETURNS TABLE(key text, template_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix set_report_template function
CREATE OR REPLACE FUNCTION public.set_report_template(p_shop_id uuid, p_key text, p_template_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix update_marketing_timestamp function
CREATE OR REPLACE FUNCTION public.update_marketing_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix get_work_order_notifications function
CREATE OR REPLACE FUNCTION public.get_work_order_notifications(work_order_id_param uuid)
RETURNS SETOF work_order_notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT * FROM work_order_notifications
  WHERE work_order_id = work_order_id_param
  ORDER BY created_at DESC;
$function$;

-- Fix update_product_submission_timestamp function
CREATE OR REPLACE FUNCTION public.update_product_submission_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;