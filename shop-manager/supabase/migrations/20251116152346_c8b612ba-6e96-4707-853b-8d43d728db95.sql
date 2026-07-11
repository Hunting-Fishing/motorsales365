-- Add additional operational roles to the enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'crane_operator';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'rigger';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'diver';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'dispatch';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'truck_driver';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'office_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'yard';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'yard_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'welder';