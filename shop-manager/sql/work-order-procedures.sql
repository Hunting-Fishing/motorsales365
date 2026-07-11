
-- This file contains the SQL to create stored procedures for work order operations

-- Create function to get work order time entries
CREATE OR REPLACE FUNCTION get_work_order_time_entries(work_order_id UUID)
RETURNS TABLE (
  id UUID,
  work_order_id UUID,
  employee_id TEXT,
  employee_name TEXT,
  start_time TEXT,
  end_time TEXT,
  duration INTEGER,
  notes TEXT,
  billable BOOLEAN
) LANGUAGE SQL AS $$
  SELECT id, work_order_id, employee_id, employee_name, start_time, end_time, duration, notes, billable
  FROM work_order_time_entries
  WHERE work_order_id = $1
  ORDER BY start_time DESC;
$$;

-- Create function to get work order inventory items
CREATE OR REPLACE FUNCTION get_work_order_inventory_items(work_order_id UUID)
RETURNS TABLE (
  id UUID,
  work_order_id UUID,
  name TEXT,
  sku TEXT,
  category TEXT,
  quantity INTEGER,
  unit_price NUMERIC
) LANGUAGE SQL AS $$
  SELECT id, work_order_id, name, sku, category, quantity, unit_price
  FROM work_order_inventory_items
  WHERE work_order_id = $1
  ORDER BY name;
$$;

-- Create function to delete work order time entries
CREATE OR REPLACE FUNCTION delete_work_order_time_entries(work_order_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  DELETE FROM work_order_time_entries
  WHERE work_order_id = $1;
$$;

-- Create function to delete work order inventory items
CREATE OR REPLACE FUNCTION delete_work_order_inventory_items(work_order_id UUID)
RETURNS VOID LANGUAGE SQL AS $$
  DELETE FROM work_order_inventory_items
  WHERE work_order_id = $1;
$$;

-- Create function to insert work order time entry
CREATE OR REPLACE FUNCTION insert_work_order_time_entry(
  p_work_order_id UUID,
  p_employee_id TEXT,
  p_employee_name TEXT,
  p_start_time TEXT,
  p_end_time TEXT,
  p_duration INTEGER,
  p_notes TEXT,
  p_billable BOOLEAN
)
RETURNS UUID LANGUAGE PLPGSQL AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO work_order_time_entries (
    work_order_id, employee_id, employee_name, start_time, end_time, duration, notes, billable
  ) VALUES (
    p_work_order_id, p_employee_id, p_employee_name, p_start_time, p_end_time, p_duration, p_notes, p_billable
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create function to insert work order inventory item
CREATE OR REPLACE FUNCTION insert_work_order_inventory_item(
  p_work_order_id UUID,
  p_name TEXT,
  p_sku TEXT,
  p_category TEXT,
  p_quantity INTEGER,
  p_unit_price NUMERIC
)
RETURNS UUID LANGUAGE PLPGSQL AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO work_order_inventory_items (
    work_order_id, name, sku, category, quantity, unit_price
  ) VALUES (
    p_work_order_id, p_name, p_sku, p_category, p_quantity, p_unit_price
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create function to record work order activity
CREATE OR REPLACE FUNCTION record_work_order_activity(
  p_action TEXT,
  p_work_order_id UUID,
  p_user_id TEXT,
  p_user_name TEXT
)
RETURNS UUID LANGUAGE PLPGSQL AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO work_order_activities (
    work_order_id, action, user_id, user_name
  ) VALUES (
    p_work_order_id, p_action, p_user_id, p_user_name
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create main function to set up all procedures
CREATE OR REPLACE FUNCTION create_work_order_procedures()
RETURNS BOOLEAN LANGUAGE PLPGSQL AS $$
BEGIN
  -- The function doesn't actually do anything since we've already created the procedures
  -- It's just a convenience function for the edge function to call
  RETURN TRUE;
END;
$$;
