
-- Projects with hierarchical budget structure
CREATE TABLE project_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  project_code TEXT,
  description TEXT,
  project_type TEXT DEFAULT 'maintenance',
  status TEXT DEFAULT 'planning',
  priority TEXT DEFAULT 'medium',
  
  -- Budget amounts
  original_budget NUMERIC NOT NULL DEFAULT 0,
  approved_budget NUMERIC,
  current_budget NUMERIC,
  contingency_amount NUMERIC DEFAULT 0,
  contingency_percent NUMERIC DEFAULT 10,
  
  -- Commitments & Spending
  committed_amount NUMERIC DEFAULT 0,
  actual_spent NUMERIC DEFAULT 0,
  forecasted_total NUMERIC,
  
  -- Timeline
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- Approvals
  requires_approval BOOLEAN DEFAULT true,
  approval_threshold NUMERIC DEFAULT 10000,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- Linking
  equipment_id UUID,
  vehicle_id UUID,
  customer_id UUID,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project phases/milestones
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project_budgets(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL,
  phase_order INTEGER DEFAULT 0,
  description TEXT,
  
  phase_budget NUMERIC DEFAULT 0,
  actual_spent NUMERIC DEFAULT 0,
  
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  
  percent_complete NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  
  depends_on_phase_id UUID REFERENCES project_phases(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cost breakdown by category
CREATE TABLE project_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project_budgets(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id),
  
  category TEXT NOT NULL,
  description TEXT,
  
  budgeted_amount NUMERIC DEFAULT 0,
  committed_amount NUMERIC DEFAULT 0,
  actual_spent NUMERIC DEFAULT 0,
  
  vendor_id UUID,
  purchase_order_number TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Change orders / budget amendments
CREATE TABLE project_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project_budgets(id) ON DELETE CASCADE,
  change_order_number TEXT,
  
  reason TEXT NOT NULL,
  description TEXT,
  
  amount_change NUMERIC NOT NULL,
  original_budget NUMERIC,
  new_budget NUMERIC,
  
  status TEXT DEFAULT 'pending',
  requested_by UUID,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Budget snapshots for version history
CREATE TABLE project_budget_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project_budgets(id) ON DELETE CASCADE,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  snapshot_type TEXT DEFAULT 'monthly',
  
  total_budget NUMERIC,
  total_committed NUMERIC,
  total_spent NUMERIC,
  forecasted_total NUMERIC,
  
  phase_data JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budget_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_budgets
CREATE POLICY "Users can view project budgets in their shop" ON project_budgets
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can insert project budgets in their shop" ON project_budgets
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update project budgets in their shop" ON project_budgets
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete project budgets in their shop" ON project_budgets
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS for project_phases (via project)
CREATE POLICY "Users can view phases via project" ON project_phases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can insert phases via project" ON project_phases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can update phases via project" ON project_phases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can delete phases via project" ON project_phases
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

-- RLS for project_cost_items
CREATE POLICY "Users can view cost items via project" ON project_cost_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can insert cost items via project" ON project_cost_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can update cost items via project" ON project_cost_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can delete cost items via project" ON project_cost_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

-- RLS for project_change_orders
CREATE POLICY "Users can view change orders via project" ON project_change_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can insert change orders via project" ON project_change_orders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can update change orders via project" ON project_change_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can delete change orders via project" ON project_change_orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

-- RLS for project_budget_snapshots
CREATE POLICY "Users can view snapshots via project" ON project_budget_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

CREATE POLICY "Users can insert snapshots via project" ON project_budget_snapshots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM project_budgets WHERE id = project_id AND shop_id = public.get_current_user_shop_id())
  );

-- Indexes for performance
CREATE INDEX idx_project_budgets_shop ON project_budgets(shop_id);
CREATE INDEX idx_project_budgets_status ON project_budgets(status);
CREATE INDEX idx_project_phases_project ON project_phases(project_id);
CREATE INDEX idx_project_cost_items_project ON project_cost_items(project_id);
CREATE INDEX idx_project_change_orders_project ON project_change_orders(project_id);
CREATE INDEX idx_project_budget_snapshots_project ON project_budget_snapshots(project_id);

-- Function to generate project codes
CREATE OR REPLACE FUNCTION generate_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_code IS NULL THEN
    NEW.project_code := UPPER(LEFT(COALESCE(NEW.project_type, 'PRJ'), 3)) || '-' || 
                        TO_CHAR(NOW(), 'YYYY') || '-' || 
                        LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_project_code
  BEFORE INSERT ON project_budgets
  FOR EACH ROW
  EXECUTE FUNCTION generate_project_code();

-- Function to generate change order numbers
CREATE OR REPLACE FUNCTION generate_change_order_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(change_order_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM project_change_orders
  WHERE project_id = NEW.project_id;
  
  NEW.change_order_number := 'CO-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_change_order_number
  BEFORE INSERT ON project_change_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_change_order_number();
