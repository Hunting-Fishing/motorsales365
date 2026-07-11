-- Fix missing database columns - Part 1: Add columns

-- 1. Add full_name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text 
GENERATED ALWAYS AS (
  CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL 
    THEN trim(first_name || ' ' || last_name)
    WHEN first_name IS NOT NULL 
    THEN first_name
    WHEN last_name IS NOT NULL 
    THEN last_name
    ELSE NULL
  END
) STORED;

-- 2. Add quantity_in_stock column to inventory_items table
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS quantity_in_stock integer;

-- Update quantity_in_stock to match existing quantity values
UPDATE public.inventory_items 
SET quantity_in_stock = quantity 
WHERE quantity_in_stock IS NULL;

-- 3. Add resource column to permissions table
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS resource text;

-- Set default resource values based on module for existing permissions
UPDATE public.permissions 
SET resource = module 
WHERE resource IS NULL;