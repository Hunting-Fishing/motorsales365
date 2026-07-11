-- Add expanded fields to work_orders table for comprehensive intake
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS customer_complaint TEXT,
ADD COLUMN IF NOT EXISTS complaint_source TEXT DEFAULT 'Customer',
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS requested_services JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS customer_instructions TEXT,
ADD COLUMN IF NOT EXISTS authorization_limit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'Phone',
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS drop_off_type TEXT DEFAULT 'Walk-in',
ADD COLUMN IF NOT EXISTS diagnostic_notes TEXT,
ADD COLUMN IF NOT EXISTS write_up_by UUID,
ADD COLUMN IF NOT EXISTS write_up_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS initial_mileage INTEGER,
ADD COLUMN IF NOT EXISTS vehicle_condition_notes TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS service_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS customer_waiting BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_warranty BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_repeat_issue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linked_prior_work_order_id UUID;

-- Add foreign key constraint for linked prior work orders
ALTER TABLE work_orders 
ADD CONSTRAINT fk_linked_prior_work_order 
FOREIGN KEY (linked_prior_work_order_id) REFERENCES work_orders(id);

-- Add check constraints for enum-like fields
ALTER TABLE work_orders 
ADD CONSTRAINT check_urgency_level 
CHECK (urgency_level IN ('Low', 'Normal', 'Urgent', 'Emergency'));

ALTER TABLE work_orders 
ADD CONSTRAINT check_drop_off_type 
CHECK (drop_off_type IN ('Walk-in', 'Appointment', 'Tow-in', 'Night Drop'));

ALTER TABLE work_orders 
ADD CONSTRAINT check_preferred_contact_method 
CHECK (preferred_contact_method IN ('Phone', 'Email', 'Text', 'In-Person'));

-- Create index for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_work_orders_urgency_level ON work_orders(urgency_level);
CREATE INDEX IF NOT EXISTS idx_work_orders_is_warranty ON work_orders(is_warranty);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_waiting ON work_orders(customer_waiting);
CREATE INDEX IF NOT EXISTS idx_work_orders_write_up_by ON work_orders(write_up_by);

-- Update RLS policies to include new fields
-- The existing policies should automatically cover the new fields

COMMENT ON COLUMN work_orders.customer_complaint IS 'Main description of the issue in customer''s words';
COMMENT ON COLUMN work_orders.complaint_source IS 'Source of complaint (Customer, Fleet Manager, Warranty Claim)';
COMMENT ON COLUMN work_orders.additional_info IS 'Non-critical observations or context';
COMMENT ON COLUMN work_orders.requested_services IS 'List of requested services as JSON array';
COMMENT ON COLUMN work_orders.customer_instructions IS 'Special requests like Call before repair';
COMMENT ON COLUMN work_orders.authorization_limit IS 'Pre-authorized dollar amount for repairs';
COMMENT ON COLUMN work_orders.urgency_level IS 'Priority level: Low, Normal, Urgent, Emergency';
COMMENT ON COLUMN work_orders.drop_off_type IS 'How vehicle was brought in';
COMMENT ON COLUMN work_orders.diagnostic_notes IS 'Internal notes for technicians';
COMMENT ON COLUMN work_orders.write_up_by IS 'Staff member who performed intake';
COMMENT ON COLUMN work_orders.initial_mileage IS 'Vehicle mileage at drop-off';
COMMENT ON COLUMN work_orders.vehicle_condition_notes IS 'Notes about vehicle condition at intake';
COMMENT ON COLUMN work_orders.attachments IS 'URLs to uploaded files, photos, videos';
COMMENT ON COLUMN work_orders.service_tags IS 'Service category tags';
COMMENT ON COLUMN work_orders.customer_waiting IS 'Whether customer is waiting onsite';
COMMENT ON COLUMN work_orders.is_warranty IS 'Whether this is a warranty claim';
COMMENT ON COLUMN work_orders.is_repeat_issue IS 'Whether this complaint occurred before';
COMMENT ON COLUMN work_orders.linked_prior_work_order_id IS 'Reference to previous related work order';