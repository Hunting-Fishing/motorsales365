-- Fix Critical RLS Policy for MAINTENANCE_REQUESTS (Dan can't see Work Requests)
-- The issue: policies check profiles.id = auth.uid() but should check profiles.user_id = auth.uid()

DROP POLICY IF EXISTS "Users can view maintenance requests from their shop" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can create maintenance requests for their shop" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update maintenance requests in their shop" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can delete maintenance requests from their shop" ON maintenance_requests;

CREATE POLICY "Users can view maintenance requests from their shop"
ON maintenance_requests FOR SELECT TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create maintenance requests for their shop"
ON maintenance_requests FOR INSERT TO authenticated
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update maintenance requests in their shop"
ON maintenance_requests FOR UPDATE TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete maintenance requests from their shop"
ON maintenance_requests FOR DELETE TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

-- Fix EQUIPMENT_ASSETS
DROP POLICY IF EXISTS "Users can view equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can create equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can update equipment in their shop" ON equipment_assets;
DROP POLICY IF EXISTS "Users can delete equipment in their shop" ON equipment_assets;

CREATE POLICY "Users can view equipment in their shop"
ON equipment_assets FOR SELECT TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create equipment in their shop"
ON equipment_assets FOR INSERT TO authenticated
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update equipment in their shop"
ON equipment_assets FOR UPDATE TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete equipment in their shop"
ON equipment_assets FOR DELETE TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

-- Fix EQUIPMENT_USAGE_LOGS
DROP POLICY IF EXISTS "Users can view usage logs from their shop" ON equipment_usage_logs;
DROP POLICY IF EXISTS "Users can create usage logs in their shop" ON equipment_usage_logs;
DROP POLICY IF EXISTS "Users can update usage logs in their shop" ON equipment_usage_logs;
DROP POLICY IF EXISTS "Users can delete usage logs from their shop" ON equipment_usage_logs;

CREATE POLICY "Users can view usage logs from their shop"
ON equipment_usage_logs FOR SELECT TO authenticated
USING (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can create usage logs in their shop"
ON equipment_usage_logs FOR INSERT TO authenticated
WITH CHECK (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can update usage logs in their shop"
ON equipment_usage_logs FOR UPDATE TO authenticated
USING (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can delete usage logs from their shop"
ON equipment_usage_logs FOR DELETE TO authenticated
USING (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

-- Fix MAINTENANCE_SCHEDULES_ENHANCED
DROP POLICY IF EXISTS "Users can view maintenance schedules from their shop" ON maintenance_schedules_enhanced;
DROP POLICY IF EXISTS "Users can create maintenance schedules in their shop" ON maintenance_schedules_enhanced;
DROP POLICY IF EXISTS "Users can update maintenance schedules in their shop" ON maintenance_schedules_enhanced;
DROP POLICY IF EXISTS "Users can delete maintenance schedules from their shop" ON maintenance_schedules_enhanced;

CREATE POLICY "Users can view maintenance schedules from their shop"
ON maintenance_schedules_enhanced FOR SELECT TO authenticated
USING (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can create maintenance schedules in their shop"
ON maintenance_schedules_enhanced FOR INSERT TO authenticated
WITH CHECK (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can update maintenance schedules in their shop"
ON maintenance_schedules_enhanced FOR UPDATE TO authenticated
USING (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can delete maintenance schedules from their shop"
ON maintenance_schedules_enhanced FOR DELETE TO authenticated
USING (equipment_id IN (
  SELECT id FROM equipment_assets WHERE shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid())
));

-- Fix BOAT_INSPECTIONS
DROP POLICY IF EXISTS "Users can view boat inspections from their shop" ON boat_inspections;
DROP POLICY IF EXISTS "Users can create boat inspections in their shop" ON boat_inspections;
DROP POLICY IF EXISTS "Users can update boat inspections in their shop" ON boat_inspections;
DROP POLICY IF EXISTS "Users can delete boat inspections from their shop" ON boat_inspections;

CREATE POLICY "Users can view boat inspections from their shop"
ON boat_inspections FOR SELECT TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create boat inspections in their shop"
ON boat_inspections FOR INSERT TO authenticated
WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update boat inspections in their shop"
ON boat_inspections FOR UPDATE TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete boat inspections from their shop"
ON boat_inspections FOR DELETE TO authenticated
USING (shop_id IN (SELECT shop_id FROM profiles WHERE user_id = auth.uid()))