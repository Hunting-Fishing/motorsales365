
-- Add additional columns to work_order_parts table for enhanced part management
ALTER TABLE work_order_parts 
ADD COLUMN IF NOT EXISTS notes_internal text,
ADD COLUMN IF NOT EXISTS bin_location text,
ADD COLUMN IF NOT EXISTS warehouse_location text,
ADD COLUMN IF NOT EXISTS shelf_location text,
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

-- Update the insert function to handle all the new fields
CREATE OR REPLACE FUNCTION public.insert_work_order_part(
  p_work_order_id uuid,
  p_job_line_id uuid,
  p_inventory_item_id uuid,
  p_part_name text,
  p_part_number text,
  p_supplier_name text,
  p_supplier_cost numeric,
  p_supplier_suggested_retail_price numeric,
  p_markup_percentage numeric,
  p_retail_price numeric,
  p_customer_price numeric,
  p_quantity integer,
  p_part_type text,
  p_invoice_number text,
  p_po_line text,
  p_notes text,
  p_category text DEFAULT NULL,
  p_is_taxable boolean DEFAULT true,
  p_core_charge_amount numeric DEFAULT 0,
  p_core_charge_applied boolean DEFAULT false,
  p_warranty_duration text DEFAULT NULL,
  p_install_date date DEFAULT NULL,
  p_installed_by text DEFAULT NULL,
  p_status text DEFAULT 'ordered',
  p_is_stock_item boolean DEFAULT true,
  p_notes_internal text DEFAULT NULL,
  p_bin_location text DEFAULT NULL,
  p_warehouse_location text DEFAULT NULL,
  p_shelf_location text DEFAULT NULL,
  p_attachments text[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  new_id UUID;
  warranty_expiry date;
BEGIN
  -- Calculate warranty expiry date if warranty duration is provided
  IF p_warranty_duration IS NOT NULL AND p_install_date IS NOT NULL THEN
    SELECT 
      CASE 
        WHEN wt.days > 0 AND wt.days < 36500 THEN p_install_date + INTERVAL '1 day' * wt.days
        ELSE NULL
      END INTO warranty_expiry
    FROM warranty_terms wt 
    WHERE wt.duration = p_warranty_duration;
  END IF;

  INSERT INTO work_order_parts(
    work_order_id, job_line_id, inventory_item_id, part_name, part_number,
    supplier_name, supplier_cost, supplier_suggested_retail_price, markup_percentage, 
    retail_price, customer_price, quantity, part_type, invoice_number, po_line, 
    notes, category, is_taxable, core_charge_amount, core_charge_applied,
    warranty_duration, warranty_expiry_date, install_date, installed_by,
    status, is_stock_item, notes_internal, bin_location, warehouse_location,
    shelf_location, attachments
  )
  VALUES (
    p_work_order_id, p_job_line_id, p_inventory_item_id, p_part_name, p_part_number,
    p_supplier_name, p_supplier_cost, p_supplier_suggested_retail_price, p_markup_percentage,
    p_retail_price, p_customer_price, p_quantity, p_part_type, p_invoice_number, p_po_line,
    p_notes, p_category, p_is_taxable, p_core_charge_amount, p_core_charge_applied,
    p_warranty_duration, warranty_expiry, p_install_date, p_installed_by,
    p_status, p_is_stock_item, p_notes_internal, p_bin_location, p_warehouse_location,
    p_shelf_location, p_attachments
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$function$;

-- Update the update function to handle all the new fields
CREATE OR REPLACE FUNCTION public.update_work_order_part(
  p_id uuid,
  p_part_name text,
  p_part_number text,
  p_supplier_name text,
  p_supplier_cost numeric,
  p_supplier_suggested_retail_price numeric,
  p_markup_percentage numeric,
  p_retail_price numeric,
  p_customer_price numeric,
  p_quantity integer,
  p_part_type text,
  p_invoice_number text,
  p_po_line text,
  p_notes text,
  p_category text DEFAULT NULL,
  p_is_taxable boolean DEFAULT true,
  p_core_charge_amount numeric DEFAULT 0,
  p_core_charge_applied boolean DEFAULT false,
  p_warranty_duration text DEFAULT NULL,
  p_install_date date DEFAULT NULL,
  p_installed_by text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_is_stock_item boolean DEFAULT true,
  p_notes_internal text DEFAULT NULL,
  p_bin_location text DEFAULT NULL,
  p_warehouse_location text DEFAULT NULL,
  p_shelf_location text DEFAULT NULL,
  p_attachments text[] DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  warranty_expiry date;
BEGIN
  -- Calculate warranty expiry date if warranty duration and install date are provided
  IF p_warranty_duration IS NOT NULL AND p_install_date IS NOT NULL THEN
    SELECT 
      CASE 
        WHEN wt.days > 0 AND wt.days < 36500 THEN p_install_date + INTERVAL '1 day' * wt.days
        ELSE NULL
      END INTO warranty_expiry
    FROM warranty_terms wt 
    WHERE wt.duration = p_warranty_duration;
  END IF;

  UPDATE work_order_parts
  SET 
    part_name = p_part_name,
    part_number = p_part_number,
    supplier_name = p_supplier_name,
    supplier_cost = p_supplier_cost,
    supplier_suggested_retail_price = p_supplier_suggested_retail_price,
    markup_percentage = p_markup_percentage,
    retail_price = p_retail_price,
    customer_price = p_customer_price,
    quantity = p_quantity,
    part_type = p_part_type,
    invoice_number = p_invoice_number,
    po_line = p_po_line,
    notes = p_notes,
    category = COALESCE(p_category, category),
    is_taxable = COALESCE(p_is_taxable, is_taxable),
    core_charge_amount = COALESCE(p_core_charge_amount, core_charge_amount),
    core_charge_applied = COALESCE(p_core_charge_applied, core_charge_applied),
    warranty_duration = COALESCE(p_warranty_duration, warranty_duration),
    warranty_expiry_date = COALESCE(warranty_expiry, warranty_expiry_date),
    install_date = COALESCE(p_install_date, install_date),
    installed_by = COALESCE(p_installed_by, installed_by),
    status = COALESCE(p_status, status),
    is_stock_item = COALESCE(p_is_stock_item, is_stock_item),
    notes_internal = COALESCE(p_notes_internal, notes_internal),
    bin_location = COALESCE(p_bin_location, bin_location),
    warehouse_location = COALESCE(p_warehouse_location, warehouse_location),
    shelf_location = COALESCE(p_shelf_location, shelf_location),
    attachments = COALESCE(p_attachments, attachments),
    updated_at = now()
  WHERE id = p_id;
  
  RETURN p_id;
END;
$function$;

-- Create warranty_terms table if it doesn't exist (for warranty calculations)
CREATE TABLE IF NOT EXISTS warranty_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration text NOT NULL UNIQUE,
  days integer NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default warranty terms
INSERT INTO warranty_terms (duration, days, description) VALUES
  ('No Warranty', 0, 'No warranty coverage'),
  ('30 Days', 30, '30 day warranty'),
  ('90 Days', 90, '90 day warranty'),
  ('6 Months', 180, '6 month warranty'),
  ('1 Year', 365, '1 year warranty'),
  ('2 Years', 730, '2 year warranty'),
  ('3 Years', 1095, '3 year warranty'),
  ('Lifetime', 36500, 'Lifetime warranty')
ON CONFLICT (duration) DO NOTHING;
