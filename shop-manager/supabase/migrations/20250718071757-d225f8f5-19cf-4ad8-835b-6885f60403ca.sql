-- Fix Function Search Path Issues (Batch 1 of 4)
-- Functions without search_path set are vulnerable to search path attacks
-- Adding SET search_path = public to secure functions

-- Fix functions with missing search_path - Batch 1 (first 50 functions)
DO $$
DECLARE
    func_rec RECORD;
    func_count INTEGER := 0;
BEGIN
    -- Process functions in batches to avoid timeouts
    FOR func_rec IN 
        SELECT n.nspname as schema_name, p.proname as function_name, p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.prosrc IS NOT NULL
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'information_schema%'
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc_config pc 
            WHERE pc.proname = p.proname 
            AND pc.setting LIKE '%search_path%'
        )
        ORDER BY p.proname
        LIMIT 50
    LOOP
        BEGIN
            -- Get function signature for ALTER statement
            EXECUTE format(
                'ALTER FUNCTION %I.%I SET search_path = public',
                func_rec.schema_name,
                func_rec.function_name
            );
            func_count := func_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log errors but continue with other functions
            RAISE NOTICE 'Could not set search_path for function %: %', func_rec.function_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Fixed search_path for % functions in batch 1', func_count;
END
$$;

-- Additional manual fixes for known critical functions
DO $$
BEGIN
    -- Fix has_role function if it exists (already has search_path but ensure it's correct)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
        ALTER FUNCTION public.has_role(uuid, text) SET search_path = public;
    END IF;
    
    -- Fix update_updated_at trigger functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
        ALTER FUNCTION public.update_updated_at() SET search_path = public;
    END IF;
    
    -- Fix timestamp update functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_business_industries_updated_at') THEN
        ALTER FUNCTION public.update_business_industries_updated_at() SET search_path = public;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_shop_updated_at') THEN
        ALTER FUNCTION public.update_shop_updated_at() SET search_path = public;
    END IF;
    
    -- Fix work order related functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_work_orders_updated_at') THEN
        ALTER FUNCTION public.update_work_orders_updated_at() SET search_path = public;
    END IF;
    
    -- Fix inventory related functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_inventory_updated_at') THEN
        ALTER FUNCTION public.update_inventory_updated_at() SET search_path = public;
    END IF;
    
    -- Fix team member functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_team_members_updated_at') THEN
        ALTER FUNCTION public.update_team_members_updated_at() SET search_path = public;
    END IF;
    
    -- Fix service category functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_service_categories_updated_at') THEN
        ALTER FUNCTION public.update_service_categories_updated_at() SET search_path = public;
    END IF;
    
END
$$;