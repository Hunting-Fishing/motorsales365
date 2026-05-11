-- Add 'sales' to app_role enum (must be its own transaction before usage)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';