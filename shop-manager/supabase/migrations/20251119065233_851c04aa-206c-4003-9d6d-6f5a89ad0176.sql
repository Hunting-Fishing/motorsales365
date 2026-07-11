-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Users can view asset assignments in their shop" ON public.asset_assignments;
DROP POLICY IF EXISTS "Users can create asset assignments in their shop" ON public.asset_assignments;
DROP POLICY IF EXISTS "Users can update asset assignments in their shop" ON public.asset_assignments;
DROP POLICY IF EXISTS "Users can delete asset assignments in their shop" ON public.asset_assignments;

-- Create comprehensive RLS policies using helper functions for better security

-- SELECT policy: Users can view assignments in their shop
CREATE POLICY "Users can view asset assignments in their shop"
ON public.asset_assignments
FOR SELECT
USING (
  shop_id = public.get_user_shop_id(auth.uid())
);

-- INSERT policy: Users can create assignments in their shop
-- Also verify the employee belongs to the same shop
CREATE POLICY "Users can create asset assignments in their shop"
ON public.asset_assignments
FOR INSERT
WITH CHECK (
  shop_id = public.get_user_shop_id(auth.uid())
  AND public.user_belongs_to_shop(employee_id, shop_id)
);

-- UPDATE policy: Users can update assignments in their shop
-- Also verify the employee still belongs to the same shop if employee_id is changed
CREATE POLICY "Users can update asset assignments in their shop"
ON public.asset_assignments
FOR UPDATE
USING (
  shop_id = public.get_user_shop_id(auth.uid())
)
WITH CHECK (
  shop_id = public.get_user_shop_id(auth.uid())
  AND public.user_belongs_to_shop(employee_id, shop_id)
);

-- DELETE policy: Users can delete assignments in their shop
CREATE POLICY "Users can delete asset assignments in their shop"
ON public.asset_assignments
FOR DELETE
USING (
  shop_id = public.get_user_shop_id(auth.uid())
);

-- Add constraints to ensure data integrity
ALTER TABLE public.asset_assignments
ADD CONSTRAINT valid_recurrence_config CHECK (
  (is_recurring = false) OR 
  (is_recurring = true AND recurrence_pattern IS NOT NULL)
);

ALTER TABLE public.asset_assignments
ADD CONSTRAINT valid_recurrence_days CHECK (
  (recurrence_pattern NOT IN ('weekly', 'biweekly')) OR
  (recurrence_days_of_week IS NOT NULL AND array_length(recurrence_days_of_week, 1) > 0)
);

-- Create a function to validate asset exists and belongs to the shop
CREATE OR REPLACE FUNCTION public.validate_asset_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  asset_shop_id UUID;
BEGIN
  -- Validate asset exists and belongs to the correct shop based on asset type
  CASE NEW.asset_type
    WHEN 'equipment' THEN
      SELECT shop_id INTO asset_shop_id
      FROM equipment_assets
      WHERE id = NEW.asset_id;
      
    WHEN 'vessel' THEN
      SELECT shop_id INTO asset_shop_id
      FROM boat_inspections
      WHERE id = NEW.asset_id;
      
    WHEN 'vehicle' THEN
      -- Vehicles table doesn't have shop_id, so we skip this check
      -- But we should verify the vehicle exists
      IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.asset_id) THEN
        RAISE EXCEPTION 'Vehicle does not exist';
      END IF;
      RETURN NEW;
  END CASE;

  -- For equipment and vessels, verify shop_id matches
  IF asset_shop_id IS NULL THEN
    RAISE EXCEPTION 'Asset does not exist';
  END IF;
  
  IF asset_shop_id != NEW.shop_id THEN
    RAISE EXCEPTION 'Asset does not belong to the specified shop';
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger to validate asset assignments
DROP TRIGGER IF EXISTS validate_asset_assignment_trigger ON public.asset_assignments;
CREATE TRIGGER validate_asset_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.asset_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_asset_assignment();

-- Add function to auto-set assigned_by on insert
CREATE OR REPLACE FUNCTION public.auto_set_assignment_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-set assigned_by if not provided
  IF NEW.assigned_by IS NULL THEN
    NEW.assigned_by := auth.uid();
  END IF;
  
  -- Auto-set shop_id from current user if not provided
  IF NEW.shop_id IS NULL THEN
    NEW.shop_id := public.get_user_shop_id(auth.uid());
  END IF;
  
  -- Validate employee belongs to the shop
  IF NOT public.user_belongs_to_shop(NEW.employee_id, NEW.shop_id) THEN
    RAISE EXCEPTION 'Employee does not belong to the specified shop';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to auto-set metadata
DROP TRIGGER IF EXISTS auto_set_assignment_metadata_trigger ON public.asset_assignments;
CREATE TRIGGER auto_set_assignment_metadata_trigger
  BEFORE INSERT ON public.asset_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_assignment_metadata();

-- Create audit trail for asset assignments
CREATE OR REPLACE FUNCTION public.log_asset_assignment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_name TEXT;
BEGIN
  -- Get the user's name
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO user_name
  FROM profiles WHERE id = auth.uid();
  
  -- Log the change
  INSERT INTO audit_trail (
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    TG_OP,
    'asset_assignments',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create audit trigger
DROP TRIGGER IF EXISTS log_asset_assignment_changes_trigger ON public.asset_assignments;
CREATE TRIGGER log_asset_assignment_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.asset_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_assignment_changes();

-- Add comment to table
COMMENT ON TABLE public.asset_assignments IS 'Tracks assignment of equipment, vessels, and vehicles to employees with support for recurring schedules. Includes full RLS policies and audit logging.';