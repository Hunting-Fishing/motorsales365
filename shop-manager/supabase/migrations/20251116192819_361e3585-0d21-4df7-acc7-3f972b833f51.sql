
-- Add equipment assignments table
CREATE TABLE IF NOT EXISTS equipment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipment_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  is_primary_operator boolean DEFAULT false,
  notes text,
  UNIQUE(equipment_id, user_id)
);

CREATE INDEX idx_equipment_assignments_equipment ON equipment_assignments(equipment_id);
CREATE INDEX idx_equipment_assignments_user ON equipment_assignments(user_id);

ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view assignments in shop" ON equipment_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM equipment_assets ea WHERE ea.id = equipment_assignments.equipment_id AND ea.shop_id = get_user_shop_id(auth.uid())));

CREATE POLICY "Managers insert assignments" ON equipment_assignments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager', 'operations_manager')));

CREATE POLICY "Managers update assignments" ON equipment_assignments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager', 'operations_manager')));

CREATE POLICY "Managers delete assignments" ON equipment_assignments FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name IN ('owner', 'admin', 'manager', 'operations_manager')));

-- Create shop_role_permissions table for owner-configurable permissions
CREATE TABLE IF NOT EXISTS shop_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  module text NOT NULL,
  actions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(shop_id, role_name, module)
);

CREATE INDEX idx_shop_role_permissions_shop ON shop_role_permissions(shop_id);
CREATE INDEX idx_shop_role_permissions_role ON shop_role_permissions(role_name);

ALTER TABLE shop_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view shop permissions" ON shop_role_permissions FOR SELECT TO authenticated
USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Owners insert shop permissions" ON shop_role_permissions FOR INSERT TO authenticated
WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name = 'owner'));

CREATE POLICY "Owners update shop permissions" ON shop_role_permissions FOR UPDATE TO authenticated
USING (shop_id = get_user_shop_id(auth.uid()) AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name = 'owner'));

CREATE POLICY "Owners delete shop permissions" ON shop_role_permissions FOR DELETE TO authenticated
USING (shop_id = get_user_shop_id(auth.uid()) AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = auth.uid() AND r.name = 'owner'));

COMMENT ON TABLE equipment_assignments IS 'Assigns vessels to users - deckhands/captains only see their assigned vessels';
COMMENT ON TABLE shop_role_permissions IS 'Owner-configurable permissions per role - control what each role can access';
