-- Fix Function Search Path Issues (Corrected approach)
-- Functions without search_path set are vulnerable to search path attacks
-- Using correct PostgreSQL system tables to identify and fix functions

-- Fix functions with missing search_path - Using correct system tables
DO $$
DECLARE
    func_rec RECORD;
    func_count INTEGER := 0;
    func_signature TEXT;
BEGIN
    -- Process functions that don't have search_path set
    FOR func_rec IN 
        SELECT 
            n.nspname as schema_name, 
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'information_schema%'
        AND p.prosrc IS NOT NULL
        -- Check if search_path is not already set in proconfig
        AND NOT (
            p.proconfig IS NOT NULL 
            AND EXISTS (
                SELECT 1 
                FROM unnest(p.proconfig) AS config 
                WHERE config LIKE 'search_path=%'
            )
        )
        ORDER BY p.proname
        LIMIT 40 -- Process in smaller batches
    LOOP
        BEGIN
            -- Build function signature
            IF func_rec.func_args = '' THEN
                func_signature := format('%I.%I()', func_rec.schema_name, func_rec.function_name);
            ELSE
                func_signature := format('%I.%I(%s)', func_rec.schema_name, func_rec.function_name, func_rec.func_args);
            END IF;
            
            -- Set search_path for the function
            EXECUTE format('ALTER FUNCTION %s SET search_path = public', func_signature);
            func_count := func_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log errors but continue with other functions
            RAISE NOTICE 'Could not set search_path for function %: %', func_rec.function_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Fixed search_path for % functions', func_count;
END
$$;

-- Fix critical functions manually with explicit signatures
DO $$
BEGIN
    -- Work order related functions
    BEGIN
        ALTER FUNCTION public.update_work_orders_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_work_order_templates_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_work_order_parts_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Equipment and inventory functions
    BEGIN
        ALTER FUNCTION public.update_equipment_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_inventory_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Customer and loyalty functions  
    BEGIN
        ALTER FUNCTION public.update_loyalty_tier_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.create_default_customer_loyalty() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Team and profile functions
    BEGIN
        ALTER FUNCTION public.update_team_members_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Service related functions
    BEGIN
        ALTER FUNCTION public.update_service_categories_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_service_hierarchy_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
END
$$;