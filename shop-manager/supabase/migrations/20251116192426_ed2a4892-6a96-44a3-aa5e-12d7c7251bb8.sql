
-- CRITICAL SECURITY FIX: Enforce shop_id isolation on equipment tables
-- Current policies allow cross-organization data access

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view usage logs" ON equipment_usage_logs;
DROP POLICY IF EXISTS "Users can view inspections" ON equipment_inspections;
DROP POLICY IF EXISTS "Users can view maintenance schedules" ON maintenance_schedules_enhanced;

-- Fix equipment_usage_logs RLS
CREATE POLICY "Users can view usage logs from their shop"
ON equipment_usage_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment_assets ea
    WHERE ea.id = equipment_usage_logs.equipment_id
    AND ea.shop_id = get_user_shop_id(auth.uid())
  )
);

-- Fix equipment_inspections RLS  
CREATE POLICY "Users can view inspections from their shop"
ON equipment_inspections FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment_assets ea
    WHERE ea.id = equipment_inspections.equipment_id
    AND ea.shop_id = get_user_shop_id(auth.uid())
  )
);

-- Fix maintenance_schedules_enhanced RLS
CREATE POLICY "Users can view maintenance schedules from their shop"
ON maintenance_schedules_enhanced FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment_assets ea
    WHERE ea.id = maintenance_schedules_enhanced.equipment_id
    AND ea.shop_id = get_user_shop_id(auth.uid())
  )
);
