-- Add new enum values to gunsmith_role_type
ALTER TYPE public.gunsmith_role_type ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.gunsmith_role_type ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.gunsmith_role_type ADD VALUE IF NOT EXISTS 'reception';
ALTER TYPE public.gunsmith_role_type ADD VALUE IF NOT EXISTS 'shipping';