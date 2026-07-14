
CREATE TABLE IF NOT EXISTS shop_manager.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid,
  employee_id uuid NOT NULL,
  leave_type_id uuid REFERENCES shop_manager.leave_types(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON shop_manager.leave_requests TO authenticated;
GRANT ALL ON shop_manager.leave_requests TO service_role;

ALTER TABLE shop_manager.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_leave_requests" ON shop_manager.leave_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION shop_manager.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = shop_manager, public;

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON shop_manager.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON shop_manager.leave_requests
FOR EACH ROW EXECUTE FUNCTION shop_manager.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON shop_manager.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON shop_manager.leave_requests(status);
