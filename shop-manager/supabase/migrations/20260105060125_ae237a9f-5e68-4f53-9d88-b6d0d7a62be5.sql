-- Create table for tracking parts ordered for specific customer jobs
CREATE TABLE gunsmith_job_part_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id),
  job_id UUID REFERENCES gunsmith_jobs(id) NOT NULL,
  customer_id UUID REFERENCES customers(id),
  part_id UUID REFERENCES gunsmith_parts(id),
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  supplier TEXT,
  supplier_contact TEXT,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10,2),
  total_cost NUMERIC(10,2),
  order_date TIMESTAMPTZ DEFAULT now(),
  expected_date DATE,
  received_date DATE,
  installed_date DATE,
  status TEXT DEFAULT 'ordered',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE gunsmith_job_part_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view job part orders"
  ON gunsmith_job_part_orders FOR SELECT
  USING (true);

CREATE POLICY "Users can insert job part orders"
  ON gunsmith_job_part_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update job part orders"
  ON gunsmith_job_part_orders FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete job part orders"
  ON gunsmith_job_part_orders FOR DELETE
  USING (true);

-- Create indexes for common queries
CREATE INDEX idx_gunsmith_job_part_orders_job_id ON gunsmith_job_part_orders(job_id);
CREATE INDEX idx_gunsmith_job_part_orders_status ON gunsmith_job_part_orders(status);
CREATE INDEX idx_gunsmith_job_part_orders_shop_id ON gunsmith_job_part_orders(shop_id);

-- Add trigger for updated_at
CREATE TRIGGER update_gunsmith_job_part_orders_updated_at
  BEFORE UPDATE ON gunsmith_job_part_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();