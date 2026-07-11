-- Create water delivery audit log table for tracking changes
CREATE TABLE water_delivery_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  previous_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_water_delivery_audit_log_entity ON water_delivery_audit_log(entity_type, entity_id);
CREATE INDEX idx_water_delivery_audit_log_shop ON water_delivery_audit_log(shop_id);
CREATE INDEX idx_water_delivery_audit_log_created ON water_delivery_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE water_delivery_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view audit logs for their shop"
  ON water_delivery_audit_log FOR SELECT
  USING (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert audit logs for their shop"
  ON water_delivery_audit_log FOR INSERT
  WITH CHECK (shop_id IN (SELECT shop_id FROM profiles WHERE id = auth.uid()));