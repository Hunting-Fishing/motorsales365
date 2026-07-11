-- Add component linking columns to inspection_form_items
ALTER TABLE inspection_form_items 
ADD COLUMN IF NOT EXISTS component_category text,
ADD COLUMN IF NOT EXISTS linked_component_type text,
ADD COLUMN IF NOT EXISTS unit text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inspection_form_items_component_type 
ON inspection_form_items(linked_component_type) 
WHERE linked_component_type IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN inspection_form_items.component_category IS 'Category from component catalog (e.g., engine_hours, generator_hours)';
COMMENT ON COLUMN inspection_form_items.linked_component_type IS 'Specific component type ID (e.g., port_engine_hours, main_generator_hours)';
COMMENT ON COLUMN inspection_form_items.unit IS 'Unit of measurement (e.g., hours, gallons, psi)';