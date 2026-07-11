-- Drop the existing constraint and add the updated one with hour_meter
ALTER TABLE inspection_form_items 
DROP CONSTRAINT IF EXISTS valid_item_type;

ALTER TABLE inspection_form_items 
ADD CONSTRAINT valid_item_type 
CHECK (item_type = ANY (ARRAY['gyr_status', 'text', 'number', 'checkbox', 'date', 'hour_meter']));