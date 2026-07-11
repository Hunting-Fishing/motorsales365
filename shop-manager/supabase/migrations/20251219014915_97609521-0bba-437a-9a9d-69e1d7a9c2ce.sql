-- Add GYR status columns to equipment_inspections (1=Red, 2=Yellow, 3=Green)
ALTER TABLE public.equipment_inspections
ADD COLUMN IF NOT EXISTS fluid_levels_status integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS visual_damage_status integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS safety_equipment_status integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS operational_status integer DEFAULT 3;

-- Add check constraints for valid status values
ALTER TABLE public.equipment_inspections
ADD CONSTRAINT chk_fluid_levels_status CHECK (fluid_levels_status >= 1 AND fluid_levels_status <= 3),
ADD CONSTRAINT chk_visual_damage_status CHECK (visual_damage_status >= 1 AND visual_damage_status <= 3),
ADD CONSTRAINT chk_safety_equipment_status CHECK (safety_equipment_status >= 1 AND safety_equipment_status <= 3),
ADD CONSTRAINT chk_operational_status CHECK (operational_status >= 1 AND operational_status <= 3);

-- Add comment explaining the values
COMMENT ON COLUMN public.equipment_inspections.fluid_levels_status IS 'GYR status: 1=Red (Urgent), 2=Yellow (Needs Attention), 3=Green (OK)';
COMMENT ON COLUMN public.equipment_inspections.visual_damage_status IS 'GYR status: 1=Red (Urgent), 2=Yellow (Needs Attention), 3=Green (OK)';
COMMENT ON COLUMN public.equipment_inspections.safety_equipment_status IS 'GYR status: 1=Red (Urgent), 2=Yellow (Needs Attention), 3=Green (OK)';
COMMENT ON COLUMN public.equipment_inspections.operational_status IS 'GYR status: 1=Red (Urgent), 2=Yellow (Needs Attention), 3=Green (OK)';