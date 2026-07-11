
-- Planner board items for whiteboard, kanban, and timeline
CREATE TABLE planner_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  board_type TEXT NOT NULL DEFAULT 'kanban', -- 'whiteboard', 'kanban', 'timeline'
  item_type TEXT NOT NULL DEFAULT 'task', -- 'note', 'task', 'work_order', 'assignment', 'milestone'
  title TEXT NOT NULL,
  content TEXT,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 200,
  height NUMERIC DEFAULT 150,
  color TEXT DEFAULT '#3b82f6',
  column_id TEXT,
  row_id TEXT,
  swimlane_resource_type TEXT, -- 'employee', 'vessel', 'equipment'
  swimlane_resource_id UUID,
  
  -- Linked entities
  work_order_id UUID,
  employee_id UUID,
  equipment_id UUID,
  vehicle_id UUID,
  customer_id UUID,
  inventory_item_id UUID,
  
  -- Dates for timeline
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  duration_hours NUMERIC,
  
  -- Dependencies
  depends_on UUID[],
  
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  z_index INTEGER DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kanban board columns configuration
CREATE TABLE planner_board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  board_id TEXT NOT NULL DEFAULT 'default',
  column_key TEXT NOT NULL,
  column_name TEXT NOT NULL,
  column_order INTEGER DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  wip_limit INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Swimlane rows for resource-based views
CREATE TABLE planner_swimlanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  board_id TEXT NOT NULL DEFAULT 'default',
  resource_type TEXT NOT NULL, -- 'employee', 'vessel', 'equipment', 'bay'
  resource_id UUID,
  resource_name TEXT,
  display_order INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Planner user preferences
CREATE TABLE planner_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  default_view TEXT DEFAULT 'kanban',
  timeline_zoom TEXT DEFAULT 'week',
  show_weekends BOOLEAN DEFAULT true,
  swimlane_mode TEXT DEFAULT 'employee',
  kanban_columns_visible TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

-- Enable RLS
ALTER TABLE planner_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_swimlanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for planner_board_items
CREATE POLICY "Users can view planner items in their shop" ON planner_board_items
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create planner items in their shop" ON planner_board_items
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update planner items in their shop" ON planner_board_items
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete planner items in their shop" ON planner_board_items
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for planner_board_columns
CREATE POLICY "Users can view columns in their shop" ON planner_board_columns
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create columns in their shop" ON planner_board_columns
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update columns in their shop" ON planner_board_columns
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete columns in their shop" ON planner_board_columns
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for planner_swimlanes
CREATE POLICY "Users can view swimlanes in their shop" ON planner_swimlanes
  FOR SELECT USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can create swimlanes in their shop" ON planner_swimlanes
  FOR INSERT WITH CHECK (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update swimlanes in their shop" ON planner_swimlanes
  FOR UPDATE USING (shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can delete swimlanes in their shop" ON planner_swimlanes
  FOR DELETE USING (shop_id = public.get_current_user_shop_id());

-- RLS Policies for planner_preferences
CREATE POLICY "Users can view their own preferences" ON planner_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences" ON planner_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid() AND shop_id = public.get_current_user_shop_id());

CREATE POLICY "Users can update their own preferences" ON planner_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_planner_items_shop ON planner_board_items(shop_id);
CREATE INDEX idx_planner_items_board_type ON planner_board_items(board_type);
CREATE INDEX idx_planner_items_column ON planner_board_items(column_id);
CREATE INDEX idx_planner_items_dates ON planner_board_items(start_date, end_date);
CREATE INDEX idx_planner_items_work_order ON planner_board_items(work_order_id);
CREATE INDEX idx_planner_items_employee ON planner_board_items(employee_id);
CREATE INDEX idx_planner_columns_shop ON planner_board_columns(shop_id, board_id);
CREATE INDEX idx_planner_swimlanes_shop ON planner_swimlanes(shop_id, board_id);

-- Seed default kanban columns
INSERT INTO planner_board_columns (shop_id, board_id, column_key, column_name, column_order, color) 
SELECT 
  id as shop_id,
  'default' as board_id,
  unnest(ARRAY['backlog', 'todo', 'in_progress', 'review', 'done']) as column_key,
  unnest(ARRAY['Backlog', 'To Do', 'In Progress', 'Review', 'Done']) as column_name,
  unnest(ARRAY[0, 1, 2, 3, 4]) as column_order,
  unnest(ARRAY['#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981']) as color
FROM shops;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_planner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_planner_board_items_updated_at
  BEFORE UPDATE ON planner_board_items
  FOR EACH ROW EXECUTE FUNCTION update_planner_updated_at();

CREATE TRIGGER update_planner_board_columns_updated_at
  BEFORE UPDATE ON planner_board_columns
  FOR EACH ROW EXECUTE FUNCTION update_planner_updated_at();

CREATE TRIGGER update_planner_swimlanes_updated_at
  BEFORE UPDATE ON planner_swimlanes
  FOR EACH ROW EXECUTE FUNCTION update_planner_updated_at();

CREATE TRIGGER update_planner_preferences_updated_at
  BEFORE UPDATE ON planner_preferences
  FOR EACH ROW EXECUTE FUNCTION update_planner_updated_at();
