-- Add display_order column to roles table for drag-and-drop reordering
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Set initial display_order based on current order (alphabetical by name)
WITH ordered_roles AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM public.roles
)
UPDATE public.roles 
SET display_order = ordered_roles.rn
FROM ordered_roles 
WHERE public.roles.id = ordered_roles.id;