GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.business_types TO anon, authenticated;
GRANT ALL ON public.businesses TO service_role;
GRANT ALL ON public.business_types TO service_role;