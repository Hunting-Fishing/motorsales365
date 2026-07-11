-- Ensure Data API (PostgREST) can reach startup tables. RLS policies still enforce row access.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','shops','user_roles','roles','shop_enabled_modules',
    'business_modules','module_subscriptions','platform_developers','shop_hours'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- business_modules has a public 'view' policy for authenticated; no anon needed.
-- Keep anon out of all of these (auth-only).
