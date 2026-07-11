
-- Add assigned_employee_id to septic_service_orders
ALTER TABLE septic_service_orders
ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES septic_employees(id);

-- Add assigned_employee_id to septic_invoices
ALTER TABLE septic_invoices
ADD COLUMN IF NOT EXISTS assigned_employee_id uuid REFERENCES septic_employees(id);

-- RLS policies for the new columns inherit from parent table policies (already in place)
