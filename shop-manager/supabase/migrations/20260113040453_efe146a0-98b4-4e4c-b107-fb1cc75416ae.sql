-- Add module_slug column to roles table for module-specific filtering
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS module_slug text;

-- Tag existing roles that are appropriate for Water Delivery module
-- Universal roles (null module_slug = accessible from all modules)
-- owner, admin, manager already have NULL module_slug by default

-- Tag water-delivery specific roles
UPDATE public.roles SET module_slug = 'water-delivery' WHERE name IN ('dispatch', 'truck_driver', 'operations_manager', 'yard_manager');

-- Create index for faster module filtering
CREATE INDEX IF NOT EXISTS idx_roles_module_slug ON public.roles(module_slug);