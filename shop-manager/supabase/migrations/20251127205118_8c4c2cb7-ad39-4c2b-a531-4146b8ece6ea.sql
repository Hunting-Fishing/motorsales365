-- Add new role values to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mechanic_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'yard_manager_assistant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mechanic_manager_assistant';