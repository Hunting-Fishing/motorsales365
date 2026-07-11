-- Phase 2: Security Hardening & Cleanup Migration
-- Fix Function Search Path Issues and Security Definer Views

-- First, let's fix all functions that lack SET search_path
-- This prevents potential security vulnerabilities from search path manipulation

-- Fix update_business_industries_updated_at function
CREATE OR REPLACE FUNCTION public.update_business_industries_updated_at()
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

-- Fix update_inventory_purchase_order_item_timestamp function
CREATE OR REPLACE FUNCTION public.update_inventory_purchase_order_item_timestamp()
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

-- Fix validate_settings_migration function
CREATE OR REPLACE FUNCTION public.validate_settings_migration()
RETURNS TABLE(shop_id uuid, settings_key text, legacy_exists boolean, unified_exists boolean, values_match boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix process_completed_reminder function
CREATE OR REPLACE FUNCTION public.process_completed_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_reminder_id UUID;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.is_recurring THEN
    -- Mark the current reminder as completed
    NEW.completed_at = now();
    NEW.last_occurred_at = now();
    
    -- Generate the next occurrence
    SELECT generate_recurring_reminder(NEW.id) INTO new_reminder_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_user_progress_and_points function
CREATE OR REPLACE FUNCTION public.update_user_progress_and_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  points_to_add INTEGER := 0;
  user_point_record RECORD;
  new_achievement TEXT;
BEGIN
  -- Calculate points based on completion
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NEW.progress_type = 'article' THEN
      points_to_add := 10;
    ELSIF NEW.progress_type = 'learning_path' THEN
      points_to_add := 50;
    END IF;

    -- Update user points
    INSERT INTO public.user_points (user_id, total_points)
    VALUES (NEW.user_id, points_to_add)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = user_points.total_points + points_to_add,
      articles_completed = CASE WHEN NEW.progress_type = 'article' THEN user_points.articles_completed + 1 ELSE user_points.articles_completed END,
      paths_completed = CASE WHEN NEW.progress_type = 'learning_path' THEN user_points.paths_completed + 1 ELSE user_points.paths_completed END,
      updated_at = now();

    -- Get updated user points record
    SELECT * INTO user_point_record FROM public.user_points WHERE user_id = NEW.user_id;

    -- Check for achievements
    IF user_point_record.articles_completed = 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded, icon_name)
      VALUES (NEW.user_id, 'first_article', 'First Steps', 'Completed your first help article', 5, 'trophy');
    END IF;

    IF user_point_record.paths_completed = 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded, icon_name)
      VALUES (NEW.user_id, 'path_complete', 'Path Master', 'Completed your first learning path', 25, 'award');
    END IF;

    IF user_point_record.total_points >= 100 THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded, icon_name)
      VALUES (NEW.user_id, 'power_user', 'Power User', 'Earned 100+ points', 20, 'star')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix sync_inventory_quantity function
CREATE OR REPLACE FUNCTION public.sync_inventory_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When quantity changes, update quantity_in_stock
  IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    NEW.quantity_in_stock = NEW.quantity;
  END IF;
  
  -- When quantity_in_stock changes, update quantity
  IF NEW.quantity_in_stock IS DISTINCT FROM OLD.quantity_in_stock THEN
    NEW.quantity = NEW.quantity_in_stock;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix update_shopping_tables_timestamp function
CREATE OR REPLACE FUNCTION public.update_shopping_tables_timestamp()
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

-- Fix initialize_user_points function
CREATE OR REPLACE FUNCTION public.initialize_user_points(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_record_id UUID;
BEGIN
  INSERT INTO public.user_points (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO new_record_id;
  
  RETURN new_record_id;
END;
$function$;

-- Fix record_team_member_history function
CREATE OR REPLACE FUNCTION public.record_team_member_history(profile_id_param uuid, action_type_param text, action_by_param uuid, action_by_name_param text, details_param jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.team_member_history(
    profile_id,
    action_type,
    action_by,
    action_by_name,
    details
  )
  VALUES (
    profile_id_param,
    action_type_param,
    action_by_param,
    action_by_name_param,
    details_param
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$function$;