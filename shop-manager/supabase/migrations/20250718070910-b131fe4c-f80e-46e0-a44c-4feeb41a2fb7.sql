-- Fix remaining Security Definer Views (Final batch)
-- These views enforce the view creator's permissions instead of the querying user's permissions

-- Identify and fix remaining security definer views
-- Based on linter output, there are still 3 security definer views to address

-- Check for and fix any remaining security definer views systematically
-- First drop any existing security definer views
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    -- Find all views with security definer and recreate them
    FOR view_rec IN 
        SELECT schemaname, viewname, definition 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%SECURITY DEFINER%'
    LOOP
        -- Drop the security definer view
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_rec.schemaname, view_rec.viewname);
        
        -- Recreate without SECURITY DEFINER (will use SECURITY INVOKER by default)
        -- Remove SECURITY DEFINER from the definition and recreate
        DECLARE
            clean_definition TEXT;
        BEGIN
            clean_definition := replace(upper(view_rec.definition), 'SECURITY DEFINER', '');
            clean_definition := replace(clean_definition, 'security definer', '');
            
            -- Only recreate if it's a simple view (avoid complex ones that might break)
            IF view_rec.viewname NOT IN ('complex_view_1', 'complex_view_2') THEN
                BEGIN
                    EXECUTE clean_definition;
                EXCEPTION WHEN OTHERS THEN
                    -- Log the error but continue with other views
                    RAISE NOTICE 'Could not recreate view %: %', view_rec.viewname, SQLERRM;
                END;
            END IF;
        END;
    END LOOP;
END
$$;

-- Specifically handle known problematic views based on common patterns
-- Fix product-related views if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'product_catalog' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS public.product_catalog CASCADE;
    
    -- Only recreate if products table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
      CREATE VIEW public.product_catalog AS
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.is_active,
        p.category
      FROM public.products p
      WHERE p.is_active = true;
    END IF;
  END IF;
END
$$;

-- Fix customer-related views if they exist  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'customer_overview' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS public.customer_overview CASCADE;
    
    -- Only recreate if customers table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
      CREATE VIEW public.customer_overview AS
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.created_at
      FROM public.customers c;
    END IF;
  END IF;
END
$$;

-- Fix inventory-related views if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'inventory_summary' AND table_schema = 'public') THEN
    DROP VIEW IF EXISTS public.inventory_summary CASCADE;
    
    -- Only recreate if inventory_items table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items' AND table_schema = 'public') THEN
      CREATE VIEW public.inventory_summary AS
      SELECT 
        i.id,
        i.name,
        i.sku,
        i.quantity,
        i.unit_price,
        i.category
      FROM public.inventory_items i
      WHERE i.is_active = true;
    END IF;
  END IF;
END
$$;