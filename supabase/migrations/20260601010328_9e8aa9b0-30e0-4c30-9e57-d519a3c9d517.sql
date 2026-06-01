GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT SELECT ON public.business_types TO anon;
GRANT SELECT ON public.business_types TO authenticated;
GRANT ALL ON public.business_types TO service_role;