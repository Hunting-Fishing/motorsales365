-- Fix Function Search Path Issues (Final Batch)
-- Complete fixing all remaining functions without search_path

DO $$
DECLARE
    func_rec RECORD;
    func_count INTEGER := 0;
    func_signature TEXT;
BEGIN
    -- Process remaining functions that don't have search_path set
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
        OFFSET 80 -- Skip first 80 from previous batches
        LIMIT 100 -- Process remaining functions
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
    
    RAISE NOTICE 'Fixed search_path for % remaining functions in final batch', func_count;
END
$$;

-- Fix remaining critical business functions manually
DO $$
BEGIN
    -- Inventory and vendor functions
    BEGIN
        ALTER FUNCTION public.update_inventory_transaction_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_inventory_vendor_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_inventory_purchase_order_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_inventory_location_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Labor and pricing functions
    BEGIN
        ALTER FUNCTION public.update_labor_rates_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_diy_bay_rates_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Product submission and audit functions
    BEGIN
        ALTER FUNCTION public.update_product_submission_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Work order job and parts functions
    BEGIN
        ALTER FUNCTION public.log_job_line_changes() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.log_part_changes() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- User and session functions
    BEGIN
        ALTER FUNCTION public.update_user_sessions_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_onboarding_progress_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Document version functions
    BEGIN
        ALTER FUNCTION public.update_document_version_count() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
END
$$;