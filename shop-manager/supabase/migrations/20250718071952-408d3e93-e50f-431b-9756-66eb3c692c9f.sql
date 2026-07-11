-- Fix Function Search Path Issues (Batch 2)
-- Continue fixing remaining functions without search_path

DO $$
DECLARE
    func_rec RECORD;
    func_count INTEGER := 0;
    func_signature TEXT;
BEGIN
    -- Process next batch of functions that don't have search_path set
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
        OFFSET 40 -- Skip first 40 from previous batch
        LIMIT 40  -- Process next 40
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
    
    RAISE NOTICE 'Fixed search_path for % more functions in batch 2', func_count;
END
$$;

-- Fix more critical functions manually
DO $$
BEGIN
    -- Marketing and email functions
    BEGIN
        ALTER FUNCTION public.update_marketing_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.increment_campaign_opens(uuid) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.increment_campaign_clicks(uuid) SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Document and workflow functions
    BEGIN
        ALTER FUNCTION public.update_document_tag_usage() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_workflow_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_workflow_triggers_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Form and reminder functions
    BEGIN
        ALTER FUNCTION public.update_form_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_reminder_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Shopping and product functions
    BEGIN
        ALTER FUNCTION public.update_shopping_tables_timestamp() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        ALTER FUNCTION public.update_product_rating() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Referral functions
    BEGIN
        ALTER FUNCTION public.update_referral_tables_updated_at() SET search_path = public;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
END
$$;