-- Tool management and tracking
CREATE TYPE tool_status AS ENUM ('available', 'in_use', 'maintenance', 'broken', 'lost', 'retired');
CREATE TYPE tool_condition AS ENUM ('new', 'excellent', 'good', 'fair', 'poor', 'unusable');

-- Tools/Assets inventory
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Tool identification
  tool_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'hand_tool', 'power_tool', 'diagnostic', 'specialty', 'ppe', 'other'
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  
  -- Specifications
  specifications JSONB DEFAULT '{}'::jsonb,
  
  -- Purchase info
  purchase_date DATE,
  purchase_cost NUMERIC(12,2),
  vendor TEXT,
  warranty_expiry DATE,
  
  -- Current status
  status tool_status DEFAULT 'available',
  condition tool_condition DEFAULT 'good',
  
  -- Location and assignment
  location TEXT,
  assigned_to_equipment_id UUID REFERENCES equipment_assets(id) ON DELETE SET NULL,
  assigned_to_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to_person_name TEXT,
  assigned_date DATE,
  
  -- Maintenance
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  calibration_due_date DATE,
  
  -- Images and attachments
  images JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Tracking
  barcode TEXT,
  qr_code TEXT,
  rfid_tag TEXT,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  notes TEXT,
  
  UNIQUE(shop_id, tool_number)
);

-- Tool purchase orders
CREATE TABLE tool_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- PO details
  po_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  vendor_email TEXT,
  vendor_phone TEXT,
  
  -- Order info
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Financials
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  shipping NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'ordered', 'partial', 'received', 'cancelled'
  
  -- Approval
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_by_name TEXT NOT NULL,
  approved_by UUID REFERENCES profiles(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Payment
  payment_method TEXT,
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
  payment_date DATE,
  
  -- Notes and attachments
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(shop_id, po_number)
);

-- Tool purchase order line items
CREATE TABLE tool_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES tool_purchase_orders(id) ON DELETE CASCADE,
  
  -- Item details
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  manufacturer TEXT,
  model TEXT,
  
  -- Quantities
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  quantity_received INTEGER DEFAULT 0,
  
  -- Pricing
  unit_price NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  
  -- Status
  received_date DATE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tool checkout/assignment history
CREATE TABLE tool_checkout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  
  -- Checkout details
  checked_out_by UUID NOT NULL REFERENCES profiles(id),
  checked_out_by_name TEXT NOT NULL,
  checked_out_at TIMESTAMPTZ DEFAULT now(),
  
  -- Assignment
  assigned_to_equipment_id UUID REFERENCES equipment_assets(id) ON DELETE SET NULL,
  assigned_to_equipment_name TEXT,
  assigned_to_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to_person_name TEXT,
  
  -- Return
  checked_in_by UUID REFERENCES profiles(id),
  checked_in_by_name TEXT,
  checked_in_at TIMESTAMPTZ,
  
  -- Condition tracking
  condition_at_checkout tool_condition,
  condition_at_return tool_condition,
  damage_notes TEXT,
  
  -- Purpose
  work_order_id UUID REFERENCES work_orders(id),
  maintenance_request_id UUID REFERENCES maintenance_requests(id),
  purpose TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tool maintenance records
CREATE TABLE tool_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  
  -- Maintenance details
  maintenance_type TEXT NOT NULL, -- 'routine', 'repair', 'calibration', 'inspection'
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Work performed
  description TEXT NOT NULL,
  work_performed TEXT,
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  
  -- Costs
  labor_cost NUMERIC(12,2) DEFAULT 0,
  parts_cost NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  
  -- Performed by
  performed_by UUID REFERENCES profiles(id),
  performed_by_name TEXT,
  vendor_name TEXT,
  
  -- Status
  condition_before tool_condition,
  condition_after tool_condition,
  
  -- Next maintenance
  next_maintenance_date DATE,
  next_calibration_date DATE,
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tools_shop ON tools(shop_id);
CREATE INDEX idx_tools_status ON tools(status);
CREATE INDEX idx_tools_category ON tools(category);
CREATE INDEX idx_tools_assigned_equipment ON tools(assigned_to_equipment_id);
CREATE INDEX idx_tools_assigned_person ON tools(assigned_to_person_id);

CREATE INDEX idx_tool_pos_shop ON tool_purchase_orders(shop_id);
CREATE INDEX idx_tool_pos_status ON tool_purchase_orders(status);
CREATE INDEX idx_tool_pos_vendor ON tool_purchase_orders(vendor_name);

CREATE INDEX idx_tool_po_items_po ON tool_purchase_order_items(purchase_order_id);
CREATE INDEX idx_tool_po_items_tool ON tool_purchase_order_items(tool_id);

CREATE INDEX idx_tool_checkout_shop ON tool_checkout_history(shop_id);
CREATE INDEX idx_tool_checkout_tool ON tool_checkout_history(tool_id);
CREATE INDEX idx_tool_checkout_person ON tool_checkout_history(assigned_to_person_id);
CREATE INDEX idx_tool_checkout_equipment ON tool_checkout_history(assigned_to_equipment_id);

CREATE INDEX idx_tool_maintenance_shop ON tool_maintenance(shop_id);
CREATE INDEX idx_tool_maintenance_tool ON tool_maintenance(tool_id);
CREATE INDEX idx_tool_maintenance_date ON tool_maintenance(maintenance_date);

-- Triggers
CREATE TRIGGER tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER tool_purchase_orders_updated_at
  BEFORE UPDATE ON tool_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER tool_purchase_order_items_updated_at
  BEFORE UPDATE ON tool_purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

CREATE TRIGGER tool_maintenance_updated_at
  BEFORE UPDATE ON tool_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_equipment_updated_at();

-- Audit trails
CREATE TRIGGER tools_audit
  AFTER INSERT OR UPDATE OR DELETE ON tools
  FOR EACH ROW EXECUTE FUNCTION create_equipment_audit_trail();

CREATE TRIGGER tool_purchase_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON tool_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION create_equipment_audit_trail();

CREATE TRIGGER tool_checkout_history_audit
  AFTER INSERT OR UPDATE OR DELETE ON tool_checkout_history
  FOR EACH ROW EXECUTE FUNCTION create_equipment_audit_trail();

-- RLS Policies
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_checkout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_maintenance ENABLE ROW LEVEL SECURITY;

-- Tools policies
CREATE POLICY "Users can view tools from their shop"
  ON tools FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tools into their shop"
  ON tools FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tools in their shop"
  ON tools FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tools from their shop"
  ON tools FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Purchase orders policies
CREATE POLICY "Users can view POs from their shop"
  ON tool_purchase_orders FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create POs"
  ON tool_purchase_orders FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update POs in their shop"
  ON tool_purchase_orders FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete POs from their shop"
  ON tool_purchase_orders FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- PO items policies
CREATE POLICY "Users can view PO items from their shop"
  ON tool_purchase_order_items FOR SELECT
  USING (purchase_order_id IN (
    SELECT id FROM tool_purchase_orders 
    WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can create PO items"
  ON tool_purchase_order_items FOR INSERT
  WITH CHECK (purchase_order_id IN (
    SELECT id FROM tool_purchase_orders 
    WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can update PO items"
  ON tool_purchase_order_items FOR UPDATE
  USING (purchase_order_id IN (
    SELECT id FROM tool_purchase_orders 
    WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can delete PO items"
  ON tool_purchase_order_items FOR DELETE
  USING (purchase_order_id IN (
    SELECT id FROM tool_purchase_orders 
    WHERE shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid())
  ));

-- Checkout history policies
CREATE POLICY "Users can view checkout history from their shop"
  ON tool_checkout_history FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create checkout records"
  ON tool_checkout_history FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update checkout records in their shop"
  ON tool_checkout_history FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

-- Maintenance policies
CREATE POLICY "Users can view tool maintenance from their shop"
  ON tool_maintenance FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create tool maintenance records"
  ON tool_maintenance FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tool maintenance in their shop"
  ON tool_maintenance FOR UPDATE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tool maintenance from their shop"
  ON tool_maintenance FOR DELETE
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));