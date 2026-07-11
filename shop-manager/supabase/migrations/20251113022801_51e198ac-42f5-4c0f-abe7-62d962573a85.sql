-- Add parent_equipment_id to link safety equipment to parent equipment
ALTER TABLE public.equipment_assets 
ADD COLUMN parent_equipment_id uuid REFERENCES public.equipment_assets(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_equipment_assets_parent_equipment_id 
ON public.equipment_assets(parent_equipment_id);

-- Add comment for documentation
COMMENT ON COLUMN public.equipment_assets.parent_equipment_id IS 'Links safety equipment to their parent equipment (e.g., fire extinguisher to vessel)';